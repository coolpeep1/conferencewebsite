import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/enqueue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id: formId } = await params;
  const body = await request.json().catch(() => null);
  const attendeeIds = Array.isArray(body?.attendeeIds)
    ? body.attendeeIds.filter((value: unknown) => typeof value === "string")
    : [];

  if (!formId || !attendeeIds.length) {
    return NextResponse.json({ error: "Select at least one attendee." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: form } = await supabase
    .from("custom_forms")
    .select("id, title")
    .eq("id", formId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const { data: existingAssignments } = await supabase
    .from("form_assignments")
    .select("recipient_user_id")
    .eq("form_id", formId)
    .in("recipient_user_id", attendeeIds);

  const existingIds = new Set((existingAssignments ?? []).map((row) => row.recipient_user_id));
  const inserts = attendeeIds
    .filter((attendeeId: string) => !existingIds.has(attendeeId))
    .map((recipient_user_id: string) => ({ form_id: formId, recipient_user_id }));

  if (inserts.length) {
    const { data: createdAssignments, error } = await supabase
      .from("form_assignments")
      .insert(inserts)
      .select("id, recipient_user_id");

    if (error || !createdAssignments) {
      return NextResponse.json({ error: error?.message || "Could not create assignments." }, { status: 500 });
    }

    // Look up attendee emails so we can enqueue one form_assigned email per
    // newly-assigned recipient. Per the project spec, the admin doesn't get
    // an email on assignment — only the attendee.
    const { data: attendees } = await supabase
      .from("app_users")
      .select("id, email, full_name, role")
      .in("id", inserts.map((i: { recipient_user_id: string }) => i.recipient_user_id));

    if (attendees) {
      for (const attendee of attendees) {
        const assignment = createdAssignments.find(
          (row) => row.recipient_user_id === attendee.id
        );
        if (!assignment) continue;

        await enqueueEmail({
          recipient: {
            id: attendee.id,
            email: attendee.email,
            full_name: attendee.full_name,
            role: attendee.role,
          },
          trigger: "form_assigned",
          subject: `New form to complete: ${form.title}`,
          related_link: `/attendee/assigned-forms/${assignment.id}`,
          meta: {
            formId,
            formTitle: form.title,
            fullName: attendee.full_name,
            formLink: `/attendee/assigned-forms/${assignment.id}`,
          },
        });
      }
    }
  }

  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formId}`);
  revalidatePath("/attendee/assigned-forms");

  return NextResponse.json({
    success: true,
    sent: inserts.length,
    alreadySent: attendeeIds.length - inserts.length,
  });
}
