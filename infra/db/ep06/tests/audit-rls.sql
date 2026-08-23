CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT condition THEN RAISE EXCEPTION '%', message; END IF; END; $$;
SET ROLE ycos_app_runtime;
\echo CASE-EP06-DB-01 CLIENT_A audit isolation and mutation denial
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM app.audit_events),'A sees only A audit');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM app.audit_events WHERE audit_event_id='a2000000-0000-0000-0000-0000000000b2'),'A exact B id invisible');
DO $$ BEGIN BEGIN UPDATE app.audit_events SET action='mutated'; RAISE EXCEPTION 'mutation unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
COMMIT;
\echo CASE-EP06-DB-02 CLIENT_B audit isolation
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000b2');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM app.audit_events),'B sees only B audit');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM app.audit_events WHERE audit_event_id='a1000000-0000-0000-0000-0000000000a1'),'B exact A id invisible');
COMMIT;
RESET ROLE;
\echo EP-06-AUDIT-RLS-PASS
