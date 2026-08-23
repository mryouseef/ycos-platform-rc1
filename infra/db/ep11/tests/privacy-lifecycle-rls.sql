-- Executed only in the disposable EP-11 PostgreSQL harness with synthetic IDs.
BEGIN;
SELECT set_config('app.client_id', '00000000-0000-0000-0000-0000000000a1', true);
INSERT INTO ycos_privacy_record(record_id,client_id,classification,purpose_reference,lifecycle_state,retention_policy_reference) VALUES ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','SENSITIVE','synthetic-purpose','ACTIVE','synthetic-policy');
SELECT count(*) AS client_a_visible FROM ycos_privacy_record;
ROLLBACK;

