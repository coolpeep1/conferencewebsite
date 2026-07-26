-- Run this in the Supabase SQL editor for your project
-- (Project > SQL Editor > New query)

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Organizations attending the conference
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  num_attendees int not null default 1,
  dietary_notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'waitlisted', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin users allowed to log in to the dashboard
-- (this mirrors auth.users; row is created after you invite/create the user in Supabase Auth)
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists organizations_set_updated_at on organizations;
create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- Row Level Security
alter table organizations enable row level security;
alter table admin_users enable row level security;

-- Anyone (anon) can INSERT a registration (the public registration form),
-- but cannot read, update, or delete existing rows.
create policy "Public can register"
  on organizations for insert
  to anon
  with check (true);

-- Only logged-in admins (present in admin_users) can read/update/delete.
create policy "Admins can view all registrations"
  on organizations for select
  to authenticated
  using (exists (select 1 from admin_users where admin_users.id = auth.uid()));

create policy "Admins can update registrations"
  on organizations for update
  to authenticated
  using (exists (select 1 from admin_users where admin_users.id = auth.uid()));

create policy "Admins can delete registrations"
  on organizations for delete
  to authenticated
  using (exists (select 1 from admin_users where admin_users.id = auth.uid()));

-- Admins can see the admin_users table (to know who else is an admin)
create policy "Admins can view admin list"
  on admin_users for select
  to authenticated
  using (exists (select 1 from admin_users where admin_users.id = auth.uid()));
