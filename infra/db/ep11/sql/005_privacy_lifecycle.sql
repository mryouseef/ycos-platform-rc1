-- EP-11 synthetic-only lifecycle metadata. No real data or retention schedule.
CREATE TABLE ycos_privacy_record (
  record_id uuid PRIMARY KEY,
  client_id uuid NOT NULL,
  classification text NOT NULL CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SENSITIVE','RESTRICTED')),
  purpose_reference text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('ACTIVE','HOLD_ACTIVE','RETENTION_EVALUATED','DISPOSED','FAILED')),
  retention_policy_reference text NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_EP11_ONLY',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ycos_privacy_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE ycos_privacy_record FORCE ROW LEVEL SECURITY;
CREATE POLICY ycos_privacy_record_client_isolation ON ycos_privacy_record USING (client_id::text = current_setting('app.client_id', true)) WITH CHECK (client_id::text = current_setting('app.client_id', true));
CREATE TABLE ycos_privacy_hold (
  hold_id uuid PRIMARY KEY,
  record_id uuid NOT NULL REFERENCES ycos_privacy_record(record_id),
  client_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE','RELEASED')),
  reason_reference text NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_EP11_ONLY'
);
ALTER TABLE ycos_privacy_hold ENABLE ROW LEVEL SECURITY;
ALTER TABLE ycos_privacy_hold FORCE ROW LEVEL SECURITY;
CREATE POLICY ycos_privacy_hold_client_isolation ON ycos_privacy_hold USING (client_id::text = current_setting('app.client_id', true)) WITH CHECK (client_id::text = current_setting('app.client_id', true));
CREATE OR REPLACE FUNCTION ycos_privacy_hold_client_matches_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ycos_privacy_record WHERE record_id = NEW.record_id AND client_id = NEW.client_id) THEN
    RAISE EXCEPTION 'PRIVACY_HOLD_CLIENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ycos_privacy_hold_client_match BEFORE INSERT OR UPDATE ON ycos_privacy_hold FOR EACH ROW EXECUTE FUNCTION ycos_privacy_hold_client_matches_record();
REVOKE ALL ON ycos_privacy_record, ycos_privacy_hold FROM PUBLIC;
