-- Add password reset functionality
alter table app_users 
  add column if not exists password_reset_token text unique,
  add column if not exists password_reset_expires timestamptz;

-- Create index for faster lookups
create index if not exists app_users_password_reset_token_idx 
  on app_users (password_reset_token) 
  where password_reset_token is not null;

-- Add password_reset trigger type to email_jobs
alter table email_jobs 
  drop constraint if exists email_jobs_trigger_type_check;

alter table email_jobs 
  add constraint email_jobs_trigger_type_check 
  check (trigger_type in (
    'registration_status_changed',
    'form_assigned',
    'form_response_submitted',
    'registration_submitted',
    'password_reset'
  ));

-- Update priority range to include 0 for password_reset
alter table email_jobs 
  drop constraint if exists email_jobs_priority_check;

alter table email_jobs 
  add constraint email_jobs_priority_check 
  check (priority between 0 and 4);
