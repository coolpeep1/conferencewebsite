import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEmail } from "@/lib/email/notify";

const VALID_STATUSES = ["pending", "confirmed", "waitlisted", "declined"];

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the existing row first so we can email the registrant if the status
  // actually changed (and only then — no need to email on a no-op rewrite).
  const { data: existing } = await supabase
    .from("organizations")
    .select("id, org_name, contact_name, contact_email, created_by, status")
    .eq("id", body.id)
    .maybeSingle();

  const { error } = await supabase
    .from("organizations")
    .update({
      status: body.status,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enqueue a status-change email only when the status actually changed and
  // we have a contact email to send to. The enqueue never throws into the
  // request — it logs and returns an empty id on failure.
  if (existing && existing.contact_email && existing.status !== body.status) {
    await notifyEmail({
      recipient: {
        id: existing.created_by,
        email: existing.contact_email,
        full_name: existing.contact_name,
        role: "attendee",
      },
      trigger: "registration_status_changed",
      subject: `Your registration is ${body.status}`,
      related_link: "/attendee",
      meta: {
        organizationId: existing.id,
        orgName: existing.org_name,
        contactName: existing.contact_name,
        fullName: existing.contact_name,
        newStatus: body.status,
        oldStatus: existing.status,
      },
    });
  }

  return NextResponse.json({ success: true });
}
