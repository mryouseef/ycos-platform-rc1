-- EP-06 synthetic client-scoped audit metadata. No real identity, content, secret, token, or provider data.
RESET ROLE;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ycos_audit_producer') THEN CREATE ROLE ycos_audit_producer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; END IF; END $$;
SET ROLE ycos_schema_owner;
SET search_path = pg_catalog, app;
CREATE TABLE IF NOT EXISTS app.audit_events (
  audit_event_id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  actor_user_id uuid NOT NULL,
  effective_user_id uuid NOT NULL,
  event_type text NOT NULL,
  action text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('ALLOW','DENY')),
  reason_code text NOT NULL,
  correlation_id uuid NOT NULL,
  event_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  previous_hash text NOT NULL,
  event_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app.audit_events (audit_event_id,client_id,actor_user_id,effective_user_id,event_type,action,decision,reason_code,correlation_id,previous_hash,event_hash) VALUES
 ('a1000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','50000000-0000-0000-0000-0000000000a5','50000000-0000-0000-0000-0000000000a5','authorization.decision','case.read','ALLOW','PERMISSION_GRANTED','b1000000-0000-0000-0000-0000000000a1','GENESIS','synthetic-a'),
 ('a2000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b2','60000000-0000-0000-0000-0000000000b6','60000000-0000-0000-0000-0000000000b6','authorization.decision','case.read','ALLOW','PERMISSION_GRANTED','b2000000-0000-0000-0000-0000000000b2','synthetic-a','synthetic-b')
ON CONFLICT (audit_event_id) DO NOTHING;
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_events_client_scope ON app.audit_events;
CREATE POLICY audit_events_client_scope ON app.audit_events FOR SELECT TO ycos_app_runtime USING (client_id = app.current_client_id());
REVOKE ALL ON app.audit_events FROM PUBLIC;
REVOKE ALL ON app.audit_events FROM ycos_app_runtime;
GRANT SELECT ON app.audit_events TO ycos_app_runtime;
GRANT INSERT ON app.audit_events TO ycos_audit_producer;
RESET ROLE;
