import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const organization_role = typeof body?.organization_role === "string" ? body.organization_role.trim() : "";
  const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
  const contact_email = typeof body?.contact_email === "string" ? body.contact_email.trim().toLowerCase() : user.email;
  const { error } = await createAdminClient().from("admin_profiles").upsert({ user_id: user.id, organization_role, bio, contact_email, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  return NextResponse.json({ success: true });
}
