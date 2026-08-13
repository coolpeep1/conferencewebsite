// Email-worker.
//
// Polls the email_jobs table every WORKER_TICK_MS, claims due jobs grouped by
// recipient, picks the highest-priority job in each group, sends ONE email via
// Resend, and marks the losers as `absorbed`. Crashes are recovered by the
// reaper pass on each tick (any rows stuck in 'sending' for >5 min are reset
// to 'pending').
//
// Run under PM2 as a separate process from the Next.js server. See
// ecosystem.config.js for the process definition.

const { Client } = require("pg");
const { Resend } = require("resend");

// Load .env.local at startup so the worker behaves the same in dev and prod.
// PM2 normally handles env in prod, but this is a no-op when the keys are
// already in process.env.
try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv not installed; that's fine in prod where PM2 sets env.
}

const DATABASE_URL = process.env.DATABASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const TICK_MS = Number.parseInt(process.env.WORKER_TICK_MS || "30000", 10);
const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

if (!DATABASE_URL) {
  console.error("[email-worker] DATABASE_URL is required");
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error("[email-worker] RESEND_API_KEY is required");
  process.exit(1);
}
if (!EMAIL_FROM) {
  console.error("[email-worker] EMAIL_FROM is required");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Connect with SSL for Supabase pooler. rejectUnauthorized:false because the
// pooler uses a self-signed cert in some configs.
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function connectWithRetry(maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.connect();
      console.log("[email-worker] connected to postgres");
      return;
    } catch (err) {
      console.error(`[email-worker] connect failed (attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

// Reaper: resets rows stuck in 'sending' for more than STUCK_THRESHOLD_MS back
// to 'pending' so a crashed worker doesn't lose emails forever.
async function reapStuckJobs() {
  const { rowCount } = await client.query(
    `update email_jobs
        set status = 'pending',
            last_error = coalesce(last_error, '') || ' [reaped: stuck in sending]'
      where status = 'sending'
        and created_at < now() - ($1 || ' milliseconds')::interval`,
    [String(STUCK_THRESHOLD_MS)]
  );
  if (rowCount > 0) {
    console.log(`[email-worker] reaped ${rowCount} stuck job(s)`);
  }
}

// Pull all recipients that have at least one due pending job. SKIP LOCKED so
// a concurrent worker (or a previous tick that didn't finish) doesn't pick
// the same rows.
async function findDueRecipients(limit = 50) {
  const { rows } = await client.query(
    `select distinct coalesce(recipient_user_id::text, recipient_email) as recipient_key
       from email_jobs
      where status = 'pending'
        and batch_window_end <= now()
      limit $1`,
    [limit]
  );
  return rows.map((r) => r.recipient_key);
}

// Fetch the due pending jobs for one recipient, ordered priority ASC.
async function fetchRecipientJobs(recipientKey) {
  const { rows } = await client.query(
    `select id, recipient_user_id, recipient_email, recipient_kind, trigger_type,
            priority, subject, related_link, meta, attempt_count, created_at
       from email_jobs
      where status = 'pending'
        and batch_window_end <= now()
        and coalesce(recipient_user_id::text, recipient_email) = $1
      order by priority asc, created_at asc
      for update skip locked`,
    [recipientKey]
  );
  return rows;
}

// Claim a winner by atomically flipping it to 'sending'. Returns true if the
// claim succeeded (false means another worker grabbed it first).
async function claimWinner(jobId) {
  const { rowCount } = await client.query(
    `update email_jobs
        set status = 'sending'
      where id = $1
        and status = 'pending'`,
    [jobId]
  );
  return rowCount === 1;
}

// Mark the loser's winner as 'absorbed'. Run this inside the same transaction
// as the winner's 'sent' update so a crash mid-send leaves both rows in a
// recoverable state.
async function markAbsorbed(loserIds, winnerId) {
  if (loserIds.length === 0) return;
  await client.query(
    `update email_jobs
        set status = 'absorbed',
            absorbed_by = $1
      where id = any($2::uuid[])`,
    [winnerId, loserIds]
  );
}

async function markSent(jobId, resendMessageId) {
  await client.query(
    `update email_jobs
        set status = 'sent',
            sent_at = now(),
            resend_message_id = $2,
            attempt_count = attempt_count + 1
      where id = $1`,
    [jobId, resendMessageId]
  );
}

async function markFailed(jobId, _loserIds, errorMessage) {
  await client.query(
    `update email_jobs
        set status = case when attempt_count + 1 >= $2 then 'failed' else 'pending' end,
            attempt_count = attempt_count + 1,
            last_error = $3,
            batch_window_end = case
              when attempt_count + 1 < $2 then now() + interval '5 minutes'
              else batch_window_end
            end
      where id = $1`,
    [jobId, MAX_ATTEMPTS, errorMessage]
  );
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
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: winner.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (result.error) {
      throw new Error(result.error.message || "resend returned error");
    }

    const messageId = result.data?.id || null;
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

  // Process each recipient in its own transaction so one failure doesn't
  // block the others.
  for (const recipient of recipients) {
    try {
      await client.query("begin");
      await processRecipient(recipient);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.error(`[email-worker] tick error for ${recipient}:`, err.message);
    }
  }
}

async function main() {
  await connectWithRetry();
  console.log(`[email-worker] started, tick=${TICK_MS}ms`);

  // Run an immediate tick on startup, then on the interval.
  await tick().catch((err) => console.error("[email-worker] tick error:", err.message));

  setInterval(() => {
    tick().catch((err) => console.error("[email-worker] tick error:", err.message));
  }, TICK_MS);
}

main().catch((err) => {
  console.error("[email-worker] fatal:", err);
  process.exit(1);
});
