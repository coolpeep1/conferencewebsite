import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";
import { createSessionToken, applySessionCookie, type SessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

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

  const { data: user, error } = await supabase
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

    console.error("Signup error:", error.message);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
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
    redirectTo: "/attendee/forms",
  });
  applySessionCookie(response, token);
  return response;
}
