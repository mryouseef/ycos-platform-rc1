-- EP-03 minimal synthetic schema. client_id is the canonical isolation key.
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION ycos_schema_owner;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO ycos_app_runtime;

SET ROLE ycos_schema_owner;
SET search_path = pg_catalog, app;

ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app.client_registry (
  client_id uuid PRIMARY KEY,
  client_code text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS app.reference_status (
  code text PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS app.work_items (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  title text NOT NULL,
  status_code text NOT NULL REFERENCES app.reference_status(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_items_id_client_id_key UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS work_items_client_id_idx ON app.work_items(client_id);

CREATE TABLE IF NOT EXISTS app.work_item_notes (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  work_item_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_item_notes_parent_client_fk
    FOREIGN KEY (work_item_id, client_id)
    REFERENCES app.work_items(id, client_id)
);

CREATE INDEX IF NOT EXISTS work_item_notes_client_id_idx ON app.work_item_notes(client_id);

INSERT INTO app.client_registry (client_id, client_code) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'CLIENT_A'),
  ('00000000-0000-0000-0000-0000000000b2', 'CLIENT_B')
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO app.reference_status (code, display_name) VALUES
  ('open', 'Open'),
  ('closed', 'Closed')
ON CONFLICT (code) DO NOTHING;

INSERT INTO app.work_items (id, client_id, title, status_code) VALUES
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Synthetic A work item', 'open'),
  ('20000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b2', 'Synthetic B work item', 'open')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION app.current_client_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, app
AS $$
DECLARE
  client_context text;
BEGIN
  client_context := current_setting('app.client_id', true);
  IF client_context IS NULL OR btrim(client_context) = '' THEN
    RAISE EXCEPTION 'app.client_id is required' USING ERRCODE = '22023';
  END IF;
  RETURN client_context::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'app.client_id must be a UUID' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION app.set_client_context(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  PERFORM set_config('app.client_id', p_client_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION app.prevent_client_ownership_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client ownership reassignment requires a separate privileged workflow' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.work_item_note_client_matches_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client ownership reassignment requires a separate privileged workflow' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_items_prevent_client_reassignment ON app.work_items;
CREATE TRIGGER work_items_prevent_client_reassignment
  BEFORE UPDATE OF client_id ON app.work_items
  FOR EACH ROW EXECUTE FUNCTION app.prevent_client_ownership_reassignment();

DROP TRIGGER IF EXISTS work_item_notes_prevent_client_reassignment ON app.work_item_notes;
CREATE TRIGGER work_item_notes_prevent_client_reassignment
  BEFORE UPDATE OF client_id ON app.work_item_notes
  FOR EACH ROW EXECUTE FUNCTION app.work_item_note_client_matches_parent();

ALTER TABLE app.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.work_items FORCE ROW LEVEL SECURITY;
ALTER TABLE app.work_item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.work_item_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_items_client_scope ON app.work_items;
CREATE POLICY work_items_client_scope ON app.work_items
  FOR ALL TO ycos_app_runtime
  USING (client_id = app.current_client_id())
  WITH CHECK (client_id = app.current_client_id());

DROP POLICY IF EXISTS work_item_notes_client_scope ON app.work_item_notes;
CREATE POLICY work_item_notes_client_scope ON app.work_item_notes
  FOR ALL TO ycos_app_runtime
  USING (client_id = app.current_client_id())
  WITH CHECK (client_id = app.current_client_id());

REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.work_items, app.work_item_notes TO ycos_app_runtime;
GRANT SELECT ON app.reference_status TO ycos_app_runtime;
GRANT EXECUTE ON FUNCTION app.current_client_id(), app.set_client_context(uuid) TO ycos_app_runtime;

RESET ROLE;
