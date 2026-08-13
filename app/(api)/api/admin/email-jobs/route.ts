import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only debug view over the email_jobs queue. Returns the most recent
// 50 rows so an admin can confirm enqueueing, watch coalescing, and see
// failures. No mutations — for debugging only.
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_jobs")
    .select(
      "id, recipient_email, recipient_kind, trigger_type, priority, subject, status, attempt_count, last_error, resend_message_id, batch_window_end, sent_at, created_at, absorbed_by"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
