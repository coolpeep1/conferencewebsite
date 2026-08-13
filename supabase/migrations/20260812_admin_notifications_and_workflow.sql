create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references app_users(id) on delete cascade,
  form_id uuid,
  form_response_id uuid,
  title text not null check (length(trim(title)) > 0),
  message text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table admin_notifications enable row level security;
