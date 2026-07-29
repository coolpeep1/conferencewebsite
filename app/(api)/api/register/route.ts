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
  const { error } = await supabase.from("organizations").insert({
    created_by: user.id,
    org_name: String(org_name).trim(),
    contact_name: String(contact_name).trim(),
    contact_email: String(contact_email).trim().toLowerCase(),
    contact_phone: contact_phone ? String(contact_phone).trim() : null,
    num_attendees: attendeeCount,
    dietary_notes: dietary_notes ? String(dietary_notes).trim() : null,
  });

  if (error) {
    console.error("Registration insert error:", error.message);
    return NextResponse.json({ error: "Could not save registration. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
