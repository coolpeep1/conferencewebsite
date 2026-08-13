import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";
import { applySessionCookie, createSessionToken, type SessionUser } from "@/lib/session";

function isDevMode() {
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  if (!isDevMode()) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

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
    .upsert(
      {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: "admin",
      },
      { onConflict: "email" }
    )
    .select("id, email, full_name, role")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: error?.message || "Could not create admin." }, { status: 500 });
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };

  const response = NextResponse.json({
    success: true,
    redirectTo: "/admin/dashboard",
  });
  applySessionCookie(response, await createSessionToken(sessionUser));
  return response;
}
