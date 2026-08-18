import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find user with valid reset token
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id, email, password_reset_expires")
    .eq("password_reset_token", token)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
  }

  // Check if token is expired
  if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
    return NextResponse.json({ error: "Reset token has expired." }, { status: 400 });
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update password and clear reset token
  const { error: updateError } = await supabase
    .from("app_users")
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Password update failed:", updateError);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Password has been reset successfully." });
}
