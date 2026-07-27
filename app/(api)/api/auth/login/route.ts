import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, applySessionCookie, type SessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "admin" ? "admin" : "attendee";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id, email, full_name, role, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (role === "admin" && user.role !== "admin") {
    return NextResponse.json({ error: "This account is not listed as an admin." }, { status: 403 });
  }

  if (role === "attendee" && user.role !== "attendee") {
    return NextResponse.json(
      { error: "This account is an admin. Switch to Admin login." },
      { status: 403 }
    );
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };

  const token = await createSessionToken(sessionUser);
  const response = NextResponse.json({
    success: true,
    redirectTo: user.role === "admin" ? "/admin/dashboard" : "/attendee/forms",
  });
  applySessionCookie(response, token);
  return response;
}
