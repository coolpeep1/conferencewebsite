import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id")
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
