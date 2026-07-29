import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "attendee") return NextResponse.json({ error: "Attendee access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.assignmentId !== "string" || !body.answers || typeof body.answers !== "object") return NextResponse.json({ error: "Invalid response." }, { status: 400 });
  const supabase = createAdminClient();
  const { data: assignment } = await supabase.from("form_assignments").select("id").eq("id", body.assignmentId).eq("recipient_user_id", user.id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Form assignment not found." }, { status: 404 });
  const { error } = await supabase.from("form_responses").upsert({ assignment_id: assignment.id, respondent_id: user.id, answers: body.answers, submitted_at: new Date().toISOString() }, { onConflict: "assignment_id" });
  if (error) return NextResponse.json({ error: "Could not submit form." }, { status: 500 });
  return NextResponse.json({ success: true });
}
