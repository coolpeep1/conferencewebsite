alter table form_assignments
  add column if not exists recipient_user_id uuid references app_users(id) on delete cascade;

create unique index if not exists form_assignments_unique_recipient
  on form_assignments (form_id, recipient_user_id)
  where recipient_user_id is not null;
