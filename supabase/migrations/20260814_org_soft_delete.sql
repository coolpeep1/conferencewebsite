-- Soft-delete + 5-day retention for orgs.
-- Restore: set deleted_at = null. Hard-delete: cron job after 5 days.
-- Existing FK cascade (form_assignments.organization_id, form_responses.assignment_id)
-- handles cleanup of dependent rows at hard-delete time.

alter table organizations
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references app_users(id) on delete set null;

-- Partial index keeps the dashboard's `deleted_at is null` filter cheap.
create index if not exists organizations_deleted_at_idx
  on organizations (deleted_at) where deleted_at is null;

-- The status CHECK is intentionally NOT widened. 'declined' stays valid for
-- existing rows; the UI dropdown removes it. No new status values are needed.
