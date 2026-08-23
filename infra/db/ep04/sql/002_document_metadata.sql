-- EP-04 synthetic document metadata. client_id remains the canonical isolation key.
SET ROLE ycos_schema_owner;
SET search_path = pg_catalog, app;

CREATE TABLE IF NOT EXISTS app.documents (
  document_id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  object_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  declared_content_type text NOT NULL,
  detected_content_type text,
  byte_size bigint NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  sha256_hex text,
  security_status text NOT NULL CHECK (security_status IN ('pending_upload', 'uploaded_unverified', 'validating', 'quarantined', 'available', 'rejected', 'validation_error')),
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('active', 'delete_requested', 'held', 'deleted', 'disposition_eligible')),
  hold_reference text,
  retention_policy_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_id_client_id_key UNIQUE (document_id, client_id)
);

CREATE INDEX IF NOT EXISTS documents_client_id_idx ON app.documents(client_id);
CREATE INDEX IF NOT EXISTS documents_client_state_idx ON app.documents(client_id, security_status, lifecycle_status);

INSERT INTO app.documents (document_id, client_id, object_key, original_filename, declared_content_type, detected_content_type, byte_size, sha256_hex, security_status, lifecycle_status)
VALUES
  ('30000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'obj-6e11f7d7c1e34ef4a3ea0c5d5cb59a31', 'synthetic-a.txt', 'text/plain', 'text/plain', 16, 'synthetic-a-hash', 'available', 'active'),
  ('40000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b2', 'obj-83a9e22c4cb84e15b464698833e22ab7', 'synthetic-b.txt', 'text/plain', 'text/plain', 16, 'synthetic-b-hash', 'available', 'active')
ON CONFLICT (document_id) DO NOTHING;

CREATE OR REPLACE FUNCTION app.prevent_document_client_ownership_reassignment()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'document client ownership reassignment requires a separate privileged workflow' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_prevent_client_reassignment ON app.documents;
CREATE TRIGGER documents_prevent_client_reassignment BEFORE UPDATE OF client_id ON app.documents
  FOR EACH ROW EXECUTE FUNCTION app.prevent_document_client_ownership_reassignment();

ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_client_scope ON app.documents;
CREATE POLICY documents_client_scope ON app.documents FOR ALL TO ycos_app_runtime
  USING (client_id = app.current_client_id()) WITH CHECK (client_id = app.current_client_id());

REVOKE ALL ON app.documents FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.documents TO ycos_app_runtime;
RESET ROLE;
