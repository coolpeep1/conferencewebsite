import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const organizationName =
    typeof body?.organization_name === "string" ? body.organization_name.trim() : fullName;

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: "Full name, email, and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const passwordHash = await hashPassword(password);

  const { data: attendee, error } = await supabase
    .from("app_users")
    .insert({
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role: "attendee",
    })
    .select("id, email, full_name, role")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not create attendee." }, { status: 500 });
  }

  // Use the same merge-or-create helper as the other signup paths so an
  // admin who creates an attendee with an already-existing org name doesn't
  // produce a duplicate organizations row.
  const { error: organizationError } = await supabase.rpc("signup_or_merge_org", {
    p_user_id: attendee.id,
    p_org_name: organizationName || fullName,
    p_contact_name: fullName,
    p_contact_email: email,
    p_num_attendees: 1,
  });

  if (organizationError) {
    await supabase.from("app_users").delete().eq("id", attendee.id);
    console.error("Organization signup error:", organizationError.message);
    return NextResponse.json({ error: "Could not create attendee organization record." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: attendee.id }, { status: 201 });
}
