-- Atomic "create or merge into existing org" helper for signup flows.
--
-- Both /api/auth/signup (attendee self-serve) and /api/register (admin-driven
-- public registration) call this. It:
--   1. Looks up an existing organizations row matching `lower(btrim(p_org_name))`.
--   2. If found, UPDATEs its contact fields and increments num_attendees.
--   3. Otherwise INSERTs a new row.
--   4. Sets app_users.organization_id on the supplied user.
--
-- SECURITY DEFINER + grant to service_role is the same pattern the project
-- already uses elsewhere (RLS on, no policies, only service-role writes).
-- The unique index on `organizations.org_name_normalized` from migration
-- `20260813_org_name_normalized.sql` prevents two callers from both deciding
-- "no existing row" at the same time; if a concurrent insert wins, the loser
-- will get a 23505 error and the route handler can retry the RPC (which
-- will then take the merge path).

create or replace function public.signup_or_merge_org(
  p_user_id       uuid,
  p_org_name      text,
  p_contact_name  text,
  p_contact_email text,
  p_contact_phone text default null,
  p_num_attendees int  default 1,
  p_dietary_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm    text := lower(btrim(p_org_name));
  v_existing uuid;
  v_id      uuid;
begin
  -- The generated column org_name_normalized is the lookup key. `limit 1` is
  -- belt-and-suspenders; the unique index makes two rows impossible.
  select id into v_existing
    from organizations
    where org_name_normalized = v_norm
    limit 1;

  if v_existing is not null then
    update organizations
       set contact_name  = p_contact_name,
           contact_email = p_contact_email,
           contact_phone = coalesce(p_contact_phone, contact_phone),
           num_attendees = num_attendees + p_num_attendees,
           updated_at    = now()
     where id = v_existing
     returning id into v_id;
  else
    insert into organizations
      (created_by, org_name, contact_name, contact_email,
       contact_phone, num_attendees, dietary_notes)
    values
      (p_user_id, p_org_name, p_contact_name, p_contact_email,
       p_contact_phone, p_num_attendees, p_dietary_notes)
    returning id into v_id;
  end if;

  update app_users
     set organization_id = v_id
   where id = p_user_id;

  return v_id;
end;
$$;

-- Only the service role (server-side route handlers) should call this. End
-- users go through the route handlers, never directly.
revoke all on function public.signup_or_merge_org(
  uuid, text, text, text, text, int, text
) from public;
grant execute on function public.signup_or_merge_org(
  uuid, text, text, text, text, int, text
) to service_role;
