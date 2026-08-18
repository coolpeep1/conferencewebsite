import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEmail } from "@/lib/email/notify";

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
  const organizationIds = Array.isArray(body?.organizationIds)
    ? body.organizationIds.filter((value: unknown) => typeof value === "string")
    : [];

  if (!formId || (attendeeIds.length === 0 && organizationIds.length === 0)) {
    return NextResponse.json({ error: "Select at least one attendee or organization." }, { status: 400 });
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

  // Expand any attendeeIds into the orgs they belong to. This makes the
  // legacy per-attendee UI work with the per-org assignment model, and
  // also handles the "send to all attendees of these orgs" case in one
  // step. Attendees without an organization_id are dropped here.
  const expandedOrgIds = new Set<string>(organizationIds);
  if (attendeeIds.length > 0) {
    const { data: attendeeOrgs } = await supabase
      .from("app_users")
      .select("id, organization_id")
      .in("id", attendeeIds)
      .eq("role", "attendee");
    for (const row of attendeeOrgs ?? []) {
      if (row.organization_id) {
        expandedOrgIds.add(row.organization_id);
      }
    }
  }

  if (expandedOrgIds.size === 0) {
    return NextResponse.json(
      { error: "Selected attendees are not linked to any organization." },
      { status: 400 }
    );
  }

  // Dedupe against existing assignments keyed on (form_id, organization_id).
  const { data: existingAssignments } = await supabase
    .from("form_assignments")
    .select("organization_id")
    .eq("form_id", formId)
    .in("organization_id", Array.from(expandedOrgIds));

  const existingOrgIds = new Set(
    (existingAssignments ?? []).map((row) => row.organization_id).filter(Boolean) as string[]
  );
  const orgsToInsert = Array.from(expandedOrgIds).filter((id) => !existingOrgIds.has(id));

  if (orgsToInsert.length) {
    const inserts = orgsToInsert.map((organization_id) => ({
      form_id: formId,
      organization_id,
    }));

    const { data: createdAssignments, error } = await supabase
      .from("form_assignments")
      .insert(inserts)
      .select("id, organization_id");

    if (error || !createdAssignments) {
      return NextResponse.json(
        { error: error?.message || "Could not create assignments." },
        { status: 500 }
      );
    }

    // Look up the attendees of each newly-assigned org so we can enqueue one
    // form_assigned email per attendee. Per the project spec, the admin
    // doesn't get an email on assignment — only the attendee.
    const { data: attendees } = await supabase
      .from("app_users")
      .select("id, email, full_name, role, organization_id")
      .in("organization_id", orgsToInsert)
      .eq("role", "attendee");

    if (attendees) {
      for (const attendee of attendees) {
        await notifyEmail({
          recipient: {
            id: attendee.id,
            email: attendee.email,
            full_name: attendee.full_name,
            role: attendee.role,
          },
          trigger: "form_assigned",
          subject: `New form to complete: ${form.title}`,
          related_link: `/attendee/assigned-forms`,
          meta: {
            formId,
            formTitle: form.title,
            fullName: attendee.full_name,
            formLink: `/attendee/assigned-forms`,
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
    sent: orgsToInsert.length,
    alreadySent: existingOrgIds.size,
  });
}
