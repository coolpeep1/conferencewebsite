import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/password";
import { createSessionToken, applySessionCookie, type SessionUser } from "@/lib/session";
import { notifyEmail } from "@/lib/email/notify";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const organizationName =
    typeof body?.organization_name === "string" ? body.organization_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!fullName || !organizationName || !email || !password) {
    return NextResponse.json(
      { error: "Full name, organization name, email, and password are required." },
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

  // Merge into an existing org if a row with the same case-insensitive
  // trimmed name already exists, otherwise create a new one. Wrapped with a
  // 23505 retry because two concurrent signups for the same org name can
  // both decide "no existing row" — the unique index on
  // organizations.org_name_normalized makes the loser fail with 23505, and
  // a retry takes the merge path.
  let organizationId: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: orgId, error: orgError } = await supabase.rpc(
      "signup_or_merge_org",
      {
        p_user_id: user.id,
        p_org_name: organizationName,
        p_contact_name: fullName,
        p_contact_email: email,
        p_num_attendees: 1,
      }
    );

    if (orgError) {
      // 23505 = unique violation. On the first attempt, retry — the
      // concurrent signup that beat us will have left an org row that the
      // RPC's SELECT will now find. On the second attempt, give up.
      if (orgError.code === "23505" && attempt === 0) continue;

      await supabase.from("app_users").delete().eq("id", user.id);
      console.error("Organization signup error:", orgError.message);
      return NextResponse.json(
        { error: "Could not create the organization." },
        { status: 500 }
      );
    }

    organizationId = (orgId as string | null) ?? null;
    break;
  }

  if (!organizationId) {
    await supabase.from("app_users").delete().eq("id", user.id);
    return NextResponse.json(
      { error: "Could not create the organization." },
      { status: 500 }
    );
  }

  // Send a confirmation email to the new attendee. The worker handles
  // coalescing with other events they may receive in the same window.
  await notifyEmail({
    recipient: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    trigger: "registration_submitted",
    subject: `Registration received: ${organizationName}`,
    related_link: "/attendee",
    meta: {
      organizationId,
      orgName: organizationName,
      fullName,
    },
  });

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
