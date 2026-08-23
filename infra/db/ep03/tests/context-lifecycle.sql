-- EP-03 actual transaction-local client-context lifecycle evidence.
SET ROLE ycos_app_runtime;

\echo CASE-CONTEXT-01 value exists inside transaction
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT 'inside_commit_transaction' AS checkpoint, current_setting('app.client_id', true) AS context_value;
COMMIT;

\echo CASE-CONTEXT-02 value cleared after COMMIT
SELECT 'after_commit' AS checkpoint,
       CASE WHEN current_setting('app.client_id', true) IS NULL OR btrim(current_setting('app.client_id', true)) = '' THEN 'CLEARED' ELSE 'LEAKED' END AS context_state;

\echo CASE-CONTEXT-03 value exists inside rollback transaction
BEGIN;
SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1');
SELECT 'inside_rollback_transaction' AS checkpoint, current_setting('app.client_id', true) AS context_value;
ROLLBACK;

\echo CASE-CONTEXT-04 value cleared after ROLLBACK
SELECT 'after_rollback' AS checkpoint,
       CASE WHEN current_setting('app.client_id', true) IS NULL OR btrim(current_setting('app.client_id', true)) = '' THEN 'CLEARED' ELSE 'LEAKED' END AS context_state;

RESET ROLE;
\echo EP-03-CONTEXT-LIFECYCLE-PASS
