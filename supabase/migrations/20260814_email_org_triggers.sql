-- Extend email_jobs trigger_type CHECK with org_deleted and org_restored.
-- Follows the pattern in 20260813_password_reset.sql:15-23.

alter table email_jobs
  drop constraint if exists email_jobs_trigger_type_check;

alter table email_jobs
  add constraint email_jobs_trigger_type_check
  check (trigger_type in (
    'registration_status_changed',
    'form_assigned',
    'form_response_submitted',
    'registration_submitted',
    'password_reset',
    'org_deleted',
    'org_restored'
  ));
