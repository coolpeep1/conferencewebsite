-- Draft/published state for custom_forms + clone tracking + is_test flag
-- on form_responses. The test-submit endpoint inserts responses with
-- assignment_id = null and is_test = true; live responses keep both NOT NULL.

-- Drafts are admin-private: never assigned, never appear in attendees'
-- assigned-forms list. The 'published' status is the only one visible to
-- attendees.
alter table custom_forms
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published')),
  add column if not exists published_at timestamptz;

-- When an admin edits a form that has responses, the endpoint clones the
-- original and inserts the edit as a new row. Responses stay attached to
-- the original via this pointer so historical data is preserved.
alter table custom_forms
  add column if not exists cloned_from uuid references custom_forms(id) on delete set null;

-- is_test flags preview/test submissions. The respond route always sets
-- is_test = false (the default); the test-submit endpoint sets is_test = true.
-- All view-layer queries filter `is_test is not true`.
alter table form_responses
  add column if not exists is_test boolean not null default false;

create index if not exists form_responses_is_test_idx
  on form_responses (is_test) where is_test is true;

-- The form_responses.assignment_id UNIQUE constraint is recreated as a
-- partial index so multiple test responses (assignment_id = null) can coexist.
alter table form_responses drop constraint if exists form_responses_assignment_id_key;
create unique index if not exists form_responses_assignment_id_key
  on form_responses (assignment_id) where assignment_id is not null;

-- assignment_id is now nullable: test responses have no assignment.
alter table form_responses
  alter column assignment_id drop not null;

-- Backfill: every form that exists today has been assigned/sent, so it's
-- effectively published. The cloned_from backfill is left null (no edit history
-- preserved for legacy forms).
update custom_forms
  set status = 'published',
      published_at = created_at
  where status = 'draft';
