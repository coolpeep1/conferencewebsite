create extension if not exists "pgcrypto";

-- These drops are kept for the legacy path where this migration was re-run
-- on top of an existing schema. On a fresh schema they error with
-- "relation does not exist", so we guard them with a DO block that only
-- runs when the table is present.
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_name = 'organizations'
  ) then
    drop trigger if exists organizations_set_updated_at on organizations;
  end if;
  if exists (
    select 1 from pg_proc where proname = 'set_updated_at'
  ) then
    drop function if exists set_updated_at();
  end if;
end $$;

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

-- Grants. Supabase relies on these roles having table-level access to the
-- `public` schema; RLS still filters rows for anon/authenticated, but the
-- base GRANT is required before either role can read or write. The previous
-- default grants on `public` were lost when the schema was dropped and
-- recreated, so we set them explicitly here.
grant usage on schema public to anon, authenticated, service_role;

-- service_role bypasses RLS via `rolbypassrls = true`, so it needs the
-- underlying GRANTs to actually touch rows.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;
