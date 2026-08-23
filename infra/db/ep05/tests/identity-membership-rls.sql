CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT condition THEN RAISE EXCEPTION '%', message; END IF; END; $$;
SET ROLE ycos_app_runtime;
\echo CASE-EP05-DB-01 authorized client A database scope
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'A sees A work item only');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.documents), 'A sees A document only');
SELECT pg_temp.assert_true((SELECT count(*) >= 3 FROM app.client_memberships), 'A sees A memberships only');
COMMIT;
\echo CASE-EP05-DB-02 client B scope does not return A data
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000b2');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'B sees B work item only');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.documents), 'B sees B document only');
COMMIT;
RESET ROLE;
\echo EP-05-IDENTITY-MEMBERSHIP-RLS-PASS
