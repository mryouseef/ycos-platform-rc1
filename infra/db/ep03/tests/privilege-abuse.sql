-- EP-03 runtime privilege-abuse verification using actual PostgreSQL failures.
-- SET SESSION AUTHORIZATION avoids a superuser bootstrap session retaining authority for SET ROLE checks.
SET SESSION AUTHORIZATION ycos_app_runtime;

\echo CASE-PRIV-01 runtime cannot disable RLS
DO $$ BEGIN
  ALTER TABLE app.work_items DISABLE ROW LEVEL SECURITY;
  RAISE EXCEPTION 'runtime disabled RLS';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: runtime cannot disable RLS';
END $$;

\echo CASE-PRIV-02 runtime cannot alter policy
DO $$ BEGIN
  ALTER POLICY work_items_client_scope ON app.work_items USING (true);
  RAISE EXCEPTION 'runtime altered policy';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: runtime cannot alter policy';
END $$;

\echo CASE-PRIV-03 runtime cannot alter protected-table owner
DO $$ BEGIN
  ALTER TABLE app.work_items OWNER TO ycos_app_runtime;
  RAISE EXCEPTION 'runtime altered owner';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: runtime cannot alter table owner';
END $$;

\echo CASE-PRIV-04 runtime cannot SET ROLE to schema owner
DO $$ BEGIN
  SET ROLE ycos_schema_owner;
  RAISE EXCEPTION 'runtime set privileged role';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: runtime cannot SET ROLE to schema owner';
END $$;

\echo CASE-PRIV-05 runtime cannot create object in app schema
DO $$ BEGIN
  CREATE TABLE app.ep03_runtime_abuse_probe (id integer);
  RAISE EXCEPTION 'runtime created schema object';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: runtime cannot create schema object';
END $$;

RESET SESSION AUTHORIZATION;
\echo EP-03-PRIVILEGE-ABUSE-PASS
