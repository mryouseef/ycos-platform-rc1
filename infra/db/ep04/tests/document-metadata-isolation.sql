-- EP-04 runtime document metadata isolation, using EP-03 transaction-local client context.
CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT condition THEN RAISE EXCEPTION '%', message; END IF; END; $$;

SET ROLE ycos_app_runtime;
\echo CASE-DOC-RLS-01 CLIENT_A authorized metadata visibility
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.documents), 'CLIENT_A sees one document');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM app.documents WHERE document_id = '40000000-0000-0000-0000-0000000000b4'), 'CLIENT_A cannot see CLIENT_B document');
COMMIT;

\echo CASE-DOC-RLS-02 CLIENT_A cross-client mutation denied
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
DO $$ BEGIN
  INSERT INTO app.documents (document_id, client_id, object_key, original_filename, declared_content_type, security_status, lifecycle_status)
  VALUES ('50000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000b2', 'obj-cross-client-denied', 'denied.txt', 'text/plain', 'pending_upload', 'active');
  RAISE EXCEPTION 'cross-client insert unexpectedly permitted';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ DECLARE changed integer; BEGIN
  UPDATE app.documents SET original_filename = 'unsafe.txt' WHERE document_id = '40000000-0000-0000-0000-0000000000b4';
  GET DIAGNOSTICS changed = ROW_COUNT; PERFORM pg_temp.assert_true(changed = 0, 'cross-client update affects zero rows');
END $$;
DO $$ DECLARE changed integer; BEGIN
  DELETE FROM app.documents WHERE document_id = '40000000-0000-0000-0000-0000000000b4';
  GET DIAGNOSTICS changed = ROW_COUNT; PERFORM pg_temp.assert_true(changed = 0, 'cross-client delete affects zero rows');
END $$;
DO $$ BEGIN
  UPDATE app.documents SET client_id = '00000000-0000-0000-0000-0000000000b2' WHERE document_id = '30000000-0000-0000-0000-0000000000a3';
  RAISE EXCEPTION 'ownership reassignment unexpectedly permitted';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
COMMIT;

\echo CASE-DOC-RLS-03 missing and invalid context fail closed
DO $$ BEGIN PERFORM count(*) FROM app.documents; RAISE EXCEPTION 'missing context unexpectedly permitted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END $$;
BEGIN;
SELECT set_config('app.client_id', 'not-a-uuid', true);
DO $$ BEGIN PERFORM count(*) FROM app.documents; RAISE EXCEPTION 'invalid context unexpectedly permitted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END $$;
ROLLBACK;
RESET ROLE;
\echo EP-04-DOCUMENT-RLS-PASS
