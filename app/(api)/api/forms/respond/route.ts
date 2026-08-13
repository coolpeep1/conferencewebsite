import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/enqueue";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "attendee") {
    return NextResponse.json({ error: "Attendee access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (
    typeof body?.assignmentId !== "string" ||
    !body.answers ||
    typeof body.answers !== "object"
  ) {
    return NextResponse.json({ error: "Invalid response payload." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Confirm the assignment exists and belongs to this attendee.
  const { data: assignment } = await supabase
    .from("form_assignments")
    .select("id, custom_forms(id, title, created_by)")
    .eq("id", body.assignmentId)
    .eq("recipient_user_id", user.id)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Form assignment not found." }, { status: 404 });
  }

  // Replace any existing response for this assignment (one submission per assignment).
  // Delete first, then insert — guarantees a single fresh row keyed by assignment_id.
  const { error: deleteError } = await supabase
    .from("form_responses")
    .delete()
    .eq("assignment_id", assignment.id);

  if (deleteError) {
    console.error("[form_responses] delete failed:", deleteError);
    return NextResponse.json(
      { error: `Could not save form: ${deleteError.message}` },
      { status: 500 }
    );
  }

  const { data: resp, error: insertError } = await supabase
    .from("form_responses")
    .insert({
      assignment_id: assignment.id,
      respondent_id: user.id,
      answers: body.answers,
      submitted_at: new Date().toISOString(),
    })
    .select("id, submitted_at")
    .maybeSingle();

  if (insertError || !resp) {
    console.error("[form_responses] insert failed:", insertError);
    return NextResponse.json(
      { error: `Could not save form: ${insertError?.message ?? "insert returned no row"}` },
      { status: 500 }
    );
  }

  const form = Array.isArray(assignment.custom_forms)
    ? assignment.custom_forms[0]
    : assignment.custom_forms;

  if (form?.created_by) {
    await supabase.from("admin_notifications").insert({
      admin_user_id: form.created_by,
      form_id: form.id,
      form_response_id: resp.id,
      title: "New form submission",
      message: `${user.full_name} submitted ${form.title}.`,
      link: `/admin/forms/${form.id}`,
    });

    // Email the form's owning admin so they don't have to poll the bell icon.
    // The worker coalesces this with other events the admin may receive in
    // the same window.
    const { data: admin } = await supabase
      .from("app_users")
      .select("id, email, full_name, role")
      .eq("id", form.created_by)
      .maybeSingle();

    if (admin) {
      await enqueueEmail({
        recipient: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role,
        },
        trigger: "form_response_submitted",
        subject: `New submission: ${form.title}`,
        related_link: `/admin/forms/${form.id}`,
        meta: {
          formId: form.id,
          formTitle: form.title,
          formResponseId: resp.id,
          respondentName: user.full_name,
          adminName: admin.full_name,
          responsesLink: `/admin/responses?form=${form.id}`,
        },
      });
    }
  }

  // Bust caches so the admin Table View, the form detail page, and the
  // attendee's "Submitted Forms" list all show the new response on next render.
  revalidatePath("/attendee/assigned-forms");
  revalidatePath("/admin/responses");
  revalidatePath("/admin/forms");

  return NextResponse.json(
    { success: true, id: resp.id, submitted_at: resp.submitted_at },
    { status: 201 }
  );
}
