create extension if not exists "pgcrypto";

drop trigger if exists organizations_set_updated_at on organizations;
drop function if exists set_updated_at();

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null check (role in ('admin', 'attendee')),
  created_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references app_users(id) on delete set null,
  org_name text not null check (length(trim(org_name)) > 0),
  contact_name text not null check (length(trim(contact_name)) > 0),
  contact_email text not null check (length(trim(contact_email)) > 0),
  contact_phone text,
  num_attendees int not null default 1 check (num_attendees > 0),
  dietary_notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'waitlisted', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

alter table app_users enable row level security;
alter table organizations enable row level security;
