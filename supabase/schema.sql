-- Custom app auth (no Supabase Auth).
-- Run in Supabase SQL Editor.
--
-- 1. Paste and run this whole file.
-- 2. Add SUPABASE_SERVICE_ROLE_KEY and SESSION_SECRET to .env.local
-- 3. Create an admin (change email/password hash as needed):
--
--    insert into app_users (email, password_hash, full_name, role)
--    values (
--      'admin@example.com',
--      '$2b$10$IIXTjGos7qK3WE9a/OwM3utevzsGVpOJfIRHn9Zoy4PY./pu61MMW', -- password: admin123
--      'Admin',
--      'admin'
--    );
--
-- Generate a new hash anytime with:
--   node -e "require('bcryptjs').hash('your-password',10).then(console.log)"

drop policy if exists "Authenticated attendees can create registrations" on organizations;
drop policy if exists "Attendees can view own registrations" on organizations;
drop policy if exists "Admins can view all registrations" on organizations;
drop policy if exists "Admins can update registrations" on organizations;
drop policy if exists "Admins can delete registrations" on organizations;
drop policy if exists "Public can register" on organizations;
drop policy if exists "Admins can view admin list" on admin_users;
drop policy if exists "Admins and self can view admin users" on admin_users;

drop trigger if exists organizations_set_updated_at on organizations;
drop function if exists is_admin(uuid);
drop function if exists set_updated_at();

drop table if exists organizations cascade;
drop table if exists admin_users cascade;
drop table if exists app_users cascade;

create extension if not exists "pgcrypto";

create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null check (role in ('admin', 'attendee')),
  created_at timestamptz not null default now()
);

create table organizations (
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

-- App uses the service role key server-side, which bypasses RLS.
-- Keep RLS on with no policies so anon/public clients cannot read or write.
alter table app_users enable row level security;
alter table organizations enable row level security;
