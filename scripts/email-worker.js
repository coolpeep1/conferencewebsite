// Email-worker.
//
// Polls the email_jobs table every WORKER_TICK_MS, claims due jobs grouped by
// recipient, picks the highest-priority job in each group, sends ONE email via
// Nodemailer with Gmail SMTP, and marks the losers as `absorbed`. Crashes are
// recovered by the reaper pass on each tick (any rows stuck in 'sending' for >5 min
// are reset to 'pending').
//
// Run under PM2 as a separate process from the Next.js server. See
// ecosystem.config.js for the process definition.

const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

// Load .env.local at startup so the worker behaves the same in dev and prod.
// PM2 normally handles env in prod, but this is a no-op when the keys are
// already in process.env.
try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv not installed; that's fine in prod where PM2 sets env.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM;
const TICK_MS = Number.parseInt(process.env.WORKER_TICK_MS || "30000", 10);
const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

if (!SUPABASE_URL) {
  console.error("[email-worker] NEXT_PUBLIC_SUPABASE_URL is required");
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[email-worker] SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}
if (!GMAIL_USER) {
  console.error("[email-worker] GMAIL_USER is required");
  process.exit(1);
}
if (!GMAIL_PASSWORD) {
  console.error("[email-worker] GMAIL_PASSWORD is required");
  process.exit(1);
}
if (!EMAIL_FROM) {
  console.error("[email-worker] EMAIL_FROM is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASSWORD,
  },
});

// Reaper: resets rows stuck in 'sending' for more than STUCK_THRESHOLD_MS back
// to 'pending' so a crashed worker doesn't lose emails forever.
async function reapStuckJobs() {
  const thresholdDate = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from("email_jobs")
    .select("id, last_error")
    .eq("status", "sending")
    .lt("created_at", thresholdDate);

  if (error) {
    console.error("[email-worker] reap failed:", error.message);
    return;
  }

  if (data && data.length > 0) {
    const updates = data.map(job => ({
      id: job.id,
      status: "pending",
      last_error: (job.last_error || "") + " [reaped: stuck in sending]"
    }));

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("email_jobs")
        .update({ status: update.status, last_error: update.last_error })
        .eq("id", update.id);
      if (updateError) {
        console.error("[email-worker] reap update failed:", updateError.message);
      }
    }
    console.log(`[email-worker] reaped ${data.length} stuck job(s)`);
  }
}

// Pull all recipients that have at least one due pending job.
async function findDueRecipients(limit = 50) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("email_jobs")
    .select("recipient_user_id, recipient_email")
    .eq("status", "pending")
    .lte("batch_window_end", now)
    .limit(limit);

  if (error) {
    console.error("[email-worker] findDueRecipients failed:", error.message);
    return [];
  }

  // Get distinct recipients
  const recipientKeys = new Set();
  if (data) {
    for (const row of data) {
      const key = row.recipient_user_id || row.recipient_email;
      recipientKeys.add(key);
    }
  }
  return Array.from(recipientKeys);
}

// Fetch the due pending jobs for one recipient, ordered priority ASC.
async function fetchRecipientJobs(recipientKey) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("email_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("batch_window_end", now)
    .or(`recipient_user_id.eq.${recipientKey},recipient_email.eq.${recipientKey}`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[email-worker] fetchRecipientJobs failed:", error.message);
    return [];
  }
  return data || [];
}

// Claim a winner by atomically flipping it to 'sending'. Returns true if the
// claim succeeded (false means another worker grabbed it first).
async function claimWinner(jobId) {
  const { data, error } = await supabase
    .from("email_jobs")
    .update({ status: "sending" })
    .eq("id", jobId)
    .eq("status", "pending")
    .select();

  if (error) {
    console.error("[email-worker] claimWinner failed:", error.message);
    return false;
  }
  return data && data.length > 0;
}

// Mark the loser's winner as 'absorbed'. Run this inside the same transaction
// as the winner's 'sent' update so a crash mid-send leaves both rows in a
// recoverable state.
async function markAbsorbed(loserIds, winnerId) {
  if (loserIds.length === 0) return;
  const { error } = await supabase
    .from("email_jobs")
    .update({ status: "absorbed", absorbed_by: winnerId })
    .in("id", loserIds);

  if (error) {
    console.error("[email-worker] markAbsorbed failed:", error.message);
  }
}

async function markSent(jobId, messageId) {
  // Get current job to increment attempt count
  const { data: currentJob } = await supabase
    .from("email_jobs")
    .select("attempt_count")
    .eq("id", jobId)
    .single();

  if (!currentJob) return;

  const { error } = await supabase
    .from("email_jobs")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_message_id: messageId,
      attempt_count: (currentJob.attempt_count || 0) + 1
    })
    .eq("id", jobId);

  if (error) {
    console.error("[email-worker] markSent failed:", error.message);
  }
}

async function markFailed(jobId, loserIds, errorMessage) {
  // First mark absorbed losers as failed too
  if (loserIds.length > 0) {
    await supabase
      .from("email_jobs")
      .update({ status: "absorbed", absorbed_by: jobId })
      .in("id", loserIds);
  }

  // Get current job to check attempt count
  const { data: currentJob } = await supabase
    .from("email_jobs")
    .select("attempt_count")
    .eq("id", jobId)
    .single();

  if (!currentJob) return;

  const newAttemptCount = (currentJob.attempt_count || 0) + 1;
  const newStatus = newAttemptCount >= MAX_ATTEMPTS ? "failed" : "pending";
  const newBatchWindowEnd = newAttemptCount < MAX_ATTEMPTS
    ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
    : currentJob.batch_window_end;

  const { error } = await supabase
    .from("email_jobs")
    .update({
      status: newStatus,
      attempt_count: newAttemptCount,
      last_error: errorMessage,
      batch_window_end: newBatchWindowEnd
    })
    .eq("id", jobId);

  if (error) {
    console.error("[email-worker] markFailed failed:", error.message);
  }
}

// Render the email. The worker imports the React Email render helper as a
// CommonJS-friendly module. We use require() so the worker can be invoked
// without a TS build step.
async function renderBody(winner, alsoIncludes) {
  // Lazy import so the worker starts even if React Email is briefly broken.
  const { renderEmail } = require("../lib/email/render.worker");
  return renderEmail({
    trigger: winner.trigger_type,
    meta: winner.meta || {},
    alsoIncludes,
  });
}

async function processRecipient(recipientUserId) {
  const jobs = await fetchRecipientJobs(recipientUserId);
  if (jobs.length === 0) return;

  const winner = jobs[0];
  const losers = jobs.slice(1);

  const claimed = await claimWinner(winner.id);
  if (!claimed) {
    // Another worker grabbed it. Move on.
    return;
  }

  const alsoIncludes = losers.map((j) => ({ subject: j.subject }));
  let rendered;
  try {
    rendered = await renderBody(winner, alsoIncludes);
  } catch (err) {
    console.error(`[email-worker] render failed for ${winner.id}:`, err.message);
    await markFailed(winner.id, losers.map((l) => l.id), `render: ${err.message}`);
    return;
  }

  try {
    const result = await transporter.sendMail({
      from: EMAIL_FROM,
      to: winner.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    const messageId = result.messageId || null;
    await markSent(winner.id, messageId);
    await markAbsorbed(losers.map((l) => l.id), winner.id);
    console.log(
      `[email-worker] sent ${winner.id} (${winner.trigger_type}) to ${winner.recipient_email}; absorbed ${losers.length}`
    );
  } catch (err) {
    console.error(`[email-worker] send failed for ${winner.id}:`, err.message);
    await markFailed(winner.id, losers.map((l) => l.id), err.message);
  }
}

async function tick() {
  await reapStuckJobs();
  const recipients = await findDueRecipients(50);
  if (recipients.length === 0) return;
  console.log(`[email-worker] processing ${recipients.length} recipient(s)`);

  // Process each recipient so one failure doesn't block the others.
  for (const recipient of recipients) {
    try {
      await processRecipient(recipient);
    } catch (err) {
      console.error(`[email-worker] error processing ${recipient}:`, err.message);
    }
  }
}

async function main() {
  console.log("[email-worker] starting (polling every " + TICK_MS + "ms)");
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[email-worker] tick error:", err.message);
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }
}

main().catch((err) => {
  console.error("[email-worker] fatal:", err);
  process.exit(1);
});
