-- EP-03 synthetic runtime isolation tests. The harness runs this in one reusable psql connection.
CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT COALESCE(condition, false) THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

SET ROLE ycos_app_runtime;

-- CLIENT_A positive SELECT/INSERT/UPDATE/DELETE and direct query boundary.
\echo CASE-01 CLIENT_A positive SELECT INSERT UPDATE DELETE
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'CLIENT_A sees exactly one direct-query row');
INSERT INTO app.work_items (id, client_id, title, status_code)
VALUES ('30000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Synthetic A transient', 'open');
UPDATE app.work_items SET title = 'Synthetic A updated' WHERE id = '30000000-0000-0000-0000-0000000000a3';
DELETE FROM app.work_items WHERE id = '30000000-0000-0000-0000-0000000000a3';
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'CLIENT_A DML remains scoped');
COMMIT;

-- Missing context fails closed after COMMIT.
\echo CASE-02 missing context fail closed
DO $$
BEGIN
  PERFORM count(*) FROM app.work_items;
  RAISE EXCEPTION 'missing context unexpectedly allowed access';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  INSERT INTO app.work_items (id, client_id, title, status_code)
  VALUES ('60000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a1', 'Missing context insert', 'open');
  RAISE EXCEPTION 'missing context unexpectedly allowed insert';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  UPDATE app.work_items SET title = 'Missing context update' WHERE id = '10000000-0000-0000-0000-0000000000a1';
  RAISE EXCEPTION 'missing context unexpectedly allowed update';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  DELETE FROM app.work_items WHERE id = '10000000-0000-0000-0000-0000000000a1';
  RAISE EXCEPTION 'missing context unexpectedly allowed delete';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;

-- CLIENT_B has only its own visibility on the same reused connection.
\echo CASE-03 CLIENT_B visibility on reused psql connection
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000b2');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'CLIENT_B sees exactly one direct-query row');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM app.work_items WHERE client_id = '00000000-0000-0000-0000-0000000000a1'), 'CLIENT_B cannot discover CLIENT_A');
INSERT INTO app.work_items (id, client_id, title, status_code)
VALUES ('70000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000b2', 'Synthetic B transient', 'open');
UPDATE app.work_items SET title = 'Synthetic B updated' WHERE id = '70000000-0000-0000-0000-0000000000b7';
DELETE FROM app.work_items WHERE id = '70000000-0000-0000-0000-0000000000b7';
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'CLIENT_B DML remains scoped');
COMMIT;

-- CLIENT_A negative cross-client SELECT/INSERT/UPDATE/DELETE and ownership reassignment.
\echo CASE-04 CLIENT_A cross-client deny, ownership reassignment, and composite FK
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM app.work_items WHERE client_id = '00000000-0000-0000-0000-0000000000b2'), 'CLIENT_A cannot select CLIENT_B');
DO $$
BEGIN
  INSERT INTO app.work_items (id, client_id, title, status_code)
  VALUES ('40000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b2', 'Unsafe B insert', 'open');
  RAISE EXCEPTION 'cross-client insert unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
DO $$
DECLARE changed integer;
BEGIN
  UPDATE app.work_items SET title = 'Unsafe B update' WHERE id = '20000000-0000-0000-0000-0000000000b2';
  GET DIAGNOSTICS changed = ROW_COUNT;
  PERFORM pg_temp.assert_true(changed = 0, 'CLIENT_A update of CLIENT_B affects zero rows');
END;
$$;
DO $$
DECLARE changed integer;
BEGIN
  DELETE FROM app.work_items WHERE id = '20000000-0000-0000-0000-0000000000b2';
  GET DIAGNOSTICS changed = ROW_COUNT;
  PERFORM pg_temp.assert_true(changed = 0, 'CLIENT_A delete of CLIENT_B affects zero rows');
END;
$$;
DO $$
BEGIN
  UPDATE app.work_items SET client_id = '00000000-0000-0000-0000-0000000000b2'
  WHERE id = '10000000-0000-0000-0000-0000000000a1';
  RAISE EXCEPTION 'ownership reassignment unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
DO $$
BEGIN
  INSERT INTO app.work_item_notes (id, client_id, work_item_id, body)
  VALUES ('50000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000b2', 'Cross-client FK');
  RAISE EXCEPTION 'cross-client foreign key unexpectedly allowed';
EXCEPTION WHEN foreign_key_violation THEN NULL;
END;
$$;
COMMIT;

-- Invalid context fails closed.
\echo CASE-05 invalid context fail closed
BEGIN;
SELECT set_config('app.client_id', 'not-a-uuid', true);
DO $$
BEGIN
  PERFORM count(*) FROM app.work_items;
  RAISE EXCEPTION 'invalid context unexpectedly allowed access';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  INSERT INTO app.work_items (id, client_id, title, status_code)
  VALUES ('80000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a1', 'Invalid context insert', 'open');
  RAISE EXCEPTION 'invalid context unexpectedly allowed insert';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  UPDATE app.work_items SET title = 'Invalid context update' WHERE id = '10000000-0000-0000-0000-0000000000a1';
  RAISE EXCEPTION 'invalid context unexpectedly allowed update';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
DO $$
BEGIN
  DELETE FROM app.work_items WHERE id = '10000000-0000-0000-0000-0000000000a1';
  RAISE EXCEPTION 'invalid context unexpectedly allowed delete';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
ROLLBACK;

-- Rollback clears context and the next client request remains isolated.
\echo CASE-06 rollback clearing and CLIENT_B reuse
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
ROLLBACK;
DO $$
BEGIN
  PERFORM count(*) FROM app.work_items;
  RAISE EXCEPTION 'rollback leaked context';
EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
END;
$$;
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000b2');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM app.work_items), 'reused connection has only CLIENT_B scope');
COMMIT;

RESET ROLE;
\echo EP-03-RUNTIME-ISOLATION-PASS
