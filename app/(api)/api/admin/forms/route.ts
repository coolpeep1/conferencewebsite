import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const fields = Array.isArray(body?.fields) ? body.fields : [];
  const attendeeIds = Array.isArray(body?.attendeeIds) ? body.attendeeIds.filter((id: unknown) => typeof id === "string") : [];
  if (!title || !fields.length || !attendeeIds.length) return NextResponse.json({ error: "Add a title, at least one question, and one attendee." }, { status: 400 });
  if (fields.some((field: unknown) => !field || typeof (field as { label?: unknown }).label !== "string" || !(field as { label: string }).label.trim())) return NextResponse.json({ error: "Every question needs a label." }, { status: 400 });
  const supabase = createAdminClient();
  const { data: form, error } = await supabase.from("custom_forms").insert({ created_by: user.id, title, description, fields }).select("id").single();
  if (error || !form) return NextResponse.json({ error: "Could not create the form." }, { status: 500 });
  const { error: assignmentError } = await supabase.from("form_assignments").insert(attendeeIds.map((recipient_user_id: string) => ({ form_id: form.id, recipient_user_id })));
  if (assignmentError) return NextResponse.json({ error: "Form created, but assignments could not be saved." }, { status: 500 });
  return NextResponse.json({ id: form.id }, { status: 201 });
}
