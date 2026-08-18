-- Normalize org_name for case-insensitive matching + prevent future duplicates.
--
-- Adds a stored generated column `org_name_normalized = lower(btrim(org_name))`
-- and a unique index on it. Backfills by collapsing duplicate rows (keeping
-- the earliest `created_at` per normalized name). Also adds an `organization_id`
-- FK on `app_users` so signup can link the new user to an existing org in
-- one step. Existing `app_users.organization_id` is left null — we don't
-- heuristic-backfill pre-existing users per the project decision.

-- Guard: the CHECK on org_name already prevents null/whitespace, but verify
-- anyway so a corrupt DB state doesn't blow up the generated-column add.
do $$
declare
  bad_count int;
begin
  select count(*) into bad_count
    from organizations
    where org_name is null or btrim(org_name) = '';
  if bad_count > 0 then
    raise notice 'organizations: % rows have null/whitespace org_name — fix them before applying this migration', bad_count;
    -- Abort the transaction by raising an exception. The migration will fail
    -- and the operator must clean the data first.
    raise exception 'cannot add org_name_normalized: % bad rows', bad_count;
  end if;
end $$;

-- 1. Generated stored column for the normalized name.
alter table organizations
  add column org_name_normalized text
  generated always as (lower(btrim(org_name))) stored;

-- 2. Backfill: collapse duplicate org_name rows. For each duplicate normalized
-- name, keep the earliest `created_at` row, delete the rest. The schema has
-- no other FKs into `organizations` (only `app_users.created_by`, which
-- references `app_users.id`, not `organizations.id`), so the delete is safe.
do $$
declare
  keeper_id    uuid;
  dupe_count   int;
  name_norm    text;
begin
  for keeper_id, name_norm in
    -- min(id::text) — Postgres won't infer min on uuid without an explicit cast.
    select min(id::text)::uuid, org_name_normalized
      from organizations
      group by org_name_normalized
      having count(*) > 1
  loop
    with dupes as (
      select id
        from organizations
        where org_name_normalized = name_norm
          and id <> keeper_id
    ),
    deleted as (
      delete from organizations
        where id in (select id from dupes)
        returning 1
    )
    select count(*) into dupe_count from deleted;
    raise notice 'collapsed % duplicate row(s) for normalized name "%"', dupe_count, name_norm;
  end loop;
end $$;

-- 3. Prevent future duplicates. Use a unique INDEX (not a unique constraint)
-- because the column is generated; works on all supported Postgres versions.
create unique index organizations_org_name_normalized_key
  on organizations (org_name_normalized);

-- 4. Link app_users to their organization. Nullable: admins stay null, and
-- pre-existing users stay null (no backfill).
alter table app_users
  add column organization_id uuid references organizations(id) on delete set null;

create index app_users_organization_id_idx
  on app_users (organization_id)
  where organization_id is not null;
