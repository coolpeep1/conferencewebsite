-- Re-apply GRANTs on every public table to service_role.
--
-- After running the rest of the migrations, every table needs explicit grants
-- to service_role (and ideally to authenticated for the few tables the
-- signed-in user reads via the JS SDK). RLS still filters rows for the
-- non-service roles, so granting table access does not bypass RLS — it just
-- enables the privilege that RLS then narrows.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Future tables created by later migrations automatically get these grants.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant all privileges on functions to service_role;
