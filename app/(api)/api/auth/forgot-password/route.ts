import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEmail } from "@/lib/email/notify";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find user by email
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id, email, full_name, role")
    .eq("email", email)
    .maybeSingle();

  if (error || !user) {
    // Don't reveal if email exists or not for security
    return NextResponse.json({ 
      success: true, 
      message: "If an account exists with this email, you will receive a password reset link." 
    });
  }

  // Only allow attendees to reset passwords (admins can be reset by other admins)
  if (user.role !== "attendee") {
    return NextResponse.json({ 
      success: true, 
      message: "If an account exists with this email, you will receive a password reset link." 
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Update user with reset token
  const { error: updateError } = await supabase
    .from("app_users")
    .update({
      password_reset_token: resetToken,
      password_reset_expires: resetExpires,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Password reset token update failed:", updateError);
    return NextResponse.json({ error: "Could not process password reset." }, { status: 500 });
  }

  // Send password reset email
  await notifyEmail({
    recipient: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    trigger: "password_reset",
    subject: "Password Reset Request",
    related_link: `/auth/reset-password?token=${resetToken}`,
    meta: {
      fullName: user.full_name,
      resetToken,
      resetLink: `/auth/reset-password?token=${resetToken}`,
    },
  });

  return NextResponse.json({ 
    success: true, 
    message: "If an account exists with this email, you will receive a password reset link." 
  });
}
