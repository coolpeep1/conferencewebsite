-- Email queue with coalescing-by-recipient.
-- One winner email per recipient per batching window; losing triggers are marked
-- `absorbed` (with `absorbed_by` pointing at the winner) so the user gets
-- notified in the bell icon for every event but only one email.

create table if not exists email_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Recipient identity. Nullable for organization-level events whose owning
  -- user has been deleted; the worker still sends to recipient_email.
  recipient_user_id uuid references app_users(id) on delete cascade,
  recipient_email text not null,
  recipient_kind text not null check (recipient_kind in ('admin', 'attendee', 'contact')),
  trigger_type text not null check (trigger_type in (
    'registration_status_changed',
    'form_assigned',
    'form_response_submitted',
    'registration_submitted'
  )),
  -- 0 = highest priority (always wins in a coalesce). Lower number = more
  -- important. See lib/email/enqueue.ts for the priority map.
  priority smallint not null check (priority between 0 and 4),
  -- Pre-rendered subject; the worker uses trigger_type + meta to render the
  -- body so absorbed triggers can be folded into a single email.
  subject text not null,
  body_html text not null default '',
  body_text text not null default '',
  related_link text not null default '',
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  -- Coalescing window. Jobs inserted in the same window for the same recipient
  -- are merged at send time. Set by enqueueEmail() to now() + windowMinutes.
  batch_window_end timestamptz not null,
  status text not null default 'pending' check (status in (
    'pending', 'sending', 'sent', 'absorbed', 'failed'
  )),
  -- When status = 'absorbed', this points at the email_jobs.id that "swallowed"
  -- this row. Used by the bell-icon UI to show "this was folded into email X".
  absorbed_by uuid references email_jobs(id) on delete set null,
  attempt_count smallint not null default 0,
  last_error text,
  resend_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Worker dispatcher: only fires due, non-sent jobs.
create index if not exists email_jobs_due_pending_idx
  on email_jobs (recipient_user_id, batch_window_end)
  where status = 'pending';

-- Look up "what got absorbed into this email" (for the bell-icon UI).
create index if not exists email_jobs_absorbed_by_idx
  on email_jobs (absorbed_by);

-- Look up "last email sent to this user" for an optional UI caption.
create index if not exists email_jobs_recipient_recent_idx
  on email_jobs (recipient_user_id, created_at desc);

-- Match the existing posture: RLS on, no policies. The service role bypasses
-- RLS, which is the only writer (worker + server routes). See schema.sql.
alter table email_jobs enable row level security;
