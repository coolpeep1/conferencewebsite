import { createAdminClient } from "@/lib/supabase/admin";

// Email trigger types. Each maps to a priority (lower = more important).
// The worker coalesces by recipient: in a single batching window, the job
// with the lowest priority number wins; the rest are marked `absorbed`.
export type EmailTrigger =
  | "registration_status_changed" // priority 1 — recipient care (confirmed/declined)
  | "form_assigned" // priority 2 — actionable for the recipient
  | "form_response_submitted" // priority 3 — info only
  | "registration_submitted"; // priority 4 — info only

const PRIORITY: Record<EmailTrigger, number> = {
  registration_status_changed: 1,
  form_assigned: 2,
  form_response_submitted: 3,
  registration_submitted: 4,
};

export type EmailRecipient =
  | { id: string; email: string; full_name: string; role: "admin" | "attendee" }
  // For organization-level events where we don't (or no longer) have a user row.
  | { id: null; email: string; full_name: string; role: "admin" | "attendee" };

type RecipientKind = "admin" | "attendee" | "contact";

export type EnqueueEmailArgs = {
  recipient: EmailRecipient;
  trigger: EmailTrigger;
  subject: string;
  related_link?: string;
  meta?: Record<string, unknown>;
  windowMinutes?: number;
};

export type EnqueueEmailResult = { id: string };

// Read batching window from env. Defaults to 10 minutes per the project spec.
function readWindowMinutes(): number {
  const raw = process.env.EMAIL_BATCH_WINDOW_MINUTES;
  if (!raw) return 10;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

// The recipient's role kind for the email_jobs.recipient_kind CHECK.
// `contact` is reserved for organization-level events where there's no user.
function recipientKindFor(role: "admin" | "attendee", userId: string | null): RecipientKind {
  if (!userId) return "contact";
  return role;
}

// Insert a pending email job. The body is rendered at worker time, not here,
// so absorbed triggers can be folded into one email at send time.
export async function enqueueEmail(args: EnqueueEmailArgs): Promise<EnqueueEmailResult> {
  const windowMinutes = args.windowMinutes ?? readWindowMinutes();
  const batchWindowEnd = new Date(Date.now() + windowMinutes * 60_000).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_jobs")
    .insert({
      recipient_user_id: args.recipient.id,
      recipient_email: args.recipient.email,
      recipient_kind: recipientKindFor(args.recipient.role, args.recipient.id),
      trigger_type: args.trigger,
      priority: PRIORITY[args.trigger],
      subject: args.subject,
      related_link: args.related_link ?? "",
      meta: args.meta ?? {},
      batch_window_end: batchWindowEnd,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    // Don't fail the parent request — the request itself succeeded; the email
    // is a notification. Log and move on.
    console.error("[email] enqueue failed:", error?.message ?? "no row returned");
    return { id: "" };
  }

  return { id: data.id };
}
