import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can create forms." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { org_name, contact_name, contact_email, contact_phone, num_attendees, dietary_notes } = body;
  const attendeeCount = Number(num_attendees);

  if (!org_name || !contact_name || !contact_email || !Number.isInteger(attendeeCount) || attendeeCount < 1) {
    return NextResponse.json(
      { error: "Organization name, contact name, contact email, and number of attendees are required." },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact_email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const supabase = createAdminClient();
  // Use the same merge-or-create helper as /api/auth/signup so identical
  // names collapse to a single organizations row. `user.id` here is the
  // admin making the registration; the RPC will set organization_id on
  // the admin's own app_users row, which is a harmless no-op (admins
  // never render with an org context).
  const { error } = await supabase.rpc("signup_or_merge_org", {
    p_user_id: user.id,
    p_org_name: String(org_name).trim(),
    p_contact_name: String(contact_name).trim(),
    p_contact_email: String(contact_email).trim().toLowerCase(),
    p_contact_phone: contact_phone ? String(contact_phone).trim() : null,
    p_num_attendees: attendeeCount,
    p_dietary_notes: dietary_notes ? String(dietary_notes).trim() : null,
  });

  if (error) {
    console.error("Registration insert error:", error.message);
    return NextResponse.json({ error: "Could not save registration. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
