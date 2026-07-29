create table if not exists admin_profiles (
  user_id uuid primary key references app_users(id) on delete cascade,
  organization_role text not null default '',
  bio text not null default '',
  contact_email text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists custom_forms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references app_users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists form_assignments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references custom_forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(form_id, organization_id)
);

create table if not exists form_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references form_assignments(id) on delete cascade,
  respondent_id uuid not null references app_users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz not null default now()
);

alter table admin_profiles enable row level security;
alter table custom_forms enable row level security;
alter table form_assignments enable row level security;
alter table form_responses enable row level security;
