-- EP-05 synthetic identity and authorization schema. No real identity attributes or credentials.
SET ROLE ycos_schema_owner;
SET search_path = pg_catalog, app;

CREATE TABLE IF NOT EXISTS app.platform_users (
  platform_user_id uuid PRIMARY KEY,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('active', 'suspended', 'revoked')),
  display_label text NOT NULL
);

CREATE TABLE IF NOT EXISTS app.external_identity_mappings (
  mapping_id uuid PRIMARY KEY,
  platform_user_id uuid NOT NULL REFERENCES app.platform_users(platform_user_id),
  issuer_ref text NOT NULL,
  subject_ref text NOT NULL,
  provider_ref text NOT NULL,
  CONSTRAINT external_identity_issuer_subject_key UNIQUE (issuer_ref, subject_ref)
);

CREATE TABLE IF NOT EXISTS app.client_memberships (
  membership_id uuid PRIMARY KEY,
  platform_user_id uuid NOT NULL REFERENCES app.platform_users(platform_user_id),
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('active', 'pending', 'suspended', 'revoked')),
  CONSTRAINT client_membership_user_client_key UNIQUE (platform_user_id, client_id)
);

CREATE TABLE IF NOT EXISTS app.client_role_assignments (
  assignment_id uuid PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES app.client_memberships(membership_id),
  client_id uuid NOT NULL REFERENCES app.client_registry(client_id),
  role_code text NOT NULL CHECK (role_code IN ('CLIENT_MEMBER', 'CLIENT_CASE_MANAGER', 'CLIENT_DOCUMENT_MANAGER', 'CLIENT_ADMIN')),
  CONSTRAINT role_assignment_membership_client_key UNIQUE (membership_id, client_id, role_code)
);

CREATE INDEX IF NOT EXISTS client_memberships_client_idx ON app.client_memberships(client_id, lifecycle_state);
CREATE INDEX IF NOT EXISTS client_role_assignments_client_idx ON app.client_role_assignments(client_id, role_code);

INSERT INTO app.platform_users (platform_user_id, lifecycle_state, display_label) VALUES
 ('50000000-0000-0000-0000-0000000000a5', 'active', 'USER_A'),
 ('60000000-0000-0000-0000-0000000000b6', 'active', 'USER_B'),
 ('70000000-0000-0000-0000-0000000000c7', 'active', 'ADMIN_A'),
 ('80000000-0000-0000-0000-0000000000d8', 'active', 'SUPPORT_A'),
 ('90000000-0000-0000-0000-0000000000e9', 'active', 'BREAK_GLASS_A')
ON CONFLICT (platform_user_id) DO NOTHING;

INSERT INTO app.external_identity_mappings (mapping_id, platform_user_id, issuer_ref, subject_ref, provider_ref) VALUES
 ('51000000-0000-0000-0000-0000000000a5', '50000000-0000-0000-0000-0000000000a5', 'SYNTHETIC_ISSUER', 'SUBJECT_USER_A', 'SYNTHETIC_PROVIDER'),
 ('61000000-0000-0000-0000-0000000000b6', '60000000-0000-0000-0000-0000000000b6', 'SYNTHETIC_ISSUER', 'SUBJECT_USER_B', 'SYNTHETIC_PROVIDER'),
 ('71000000-0000-0000-0000-0000000000c7', '70000000-0000-0000-0000-0000000000c7', 'SYNTHETIC_ISSUER', 'SUBJECT_ADMIN_A', 'SYNTHETIC_PROVIDER'),
 ('81000000-0000-0000-0000-0000000000d8', '80000000-0000-0000-0000-0000000000d8', 'SYNTHETIC_ISSUER', 'SUBJECT_SUPPORT_A', 'SYNTHETIC_PROVIDER'),
 ('91000000-0000-0000-0000-0000000000e9', '90000000-0000-0000-0000-0000000000e9', 'SYNTHETIC_ISSUER', 'SUBJECT_BREAK_GLASS_A', 'SYNTHETIC_PROVIDER')
ON CONFLICT (issuer_ref, subject_ref) DO NOTHING;

INSERT INTO app.client_memberships (membership_id, platform_user_id, client_id, lifecycle_state) VALUES
 ('52000000-0000-0000-0000-0000000000a5', '50000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', 'active'),
 ('53000000-0000-0000-0000-0000000000a5', '50000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b2', 'active'),
 ('62000000-0000-0000-0000-0000000000b6', '60000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b2', 'active'),
 ('72000000-0000-0000-0000-0000000000c7', '70000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000a1', 'active'),
 ('82000000-0000-0000-0000-0000000000d8', '80000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a1', 'active')
ON CONFLICT (platform_user_id, client_id) DO NOTHING;

INSERT INTO app.client_role_assignments (assignment_id, membership_id, client_id, role_code) VALUES
 ('52100000-0000-0000-0000-0000000000a5', '52000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', 'CLIENT_DOCUMENT_MANAGER'),
 ('53100000-0000-0000-0000-0000000000a5', '53000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b2', 'CLIENT_MEMBER'),
 ('62100000-0000-0000-0000-0000000000b6', '62000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b2', 'CLIENT_MEMBER'),
 ('72100000-0000-0000-0000-0000000000c7', '72000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000a1', 'CLIENT_ADMIN'),
 ('82100000-0000-0000-0000-0000000000d8', '82000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a1', 'CLIENT_MEMBER')
ON CONFLICT (membership_id, client_id, role_code) DO NOTHING;

ALTER TABLE app.client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.client_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.client_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.client_role_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_memberships_client_scope ON app.client_memberships;
CREATE POLICY client_memberships_client_scope ON app.client_memberships FOR ALL TO ycos_app_runtime
 USING (client_id = app.current_client_id()) WITH CHECK (client_id = app.current_client_id());
DROP POLICY IF EXISTS client_role_assignments_client_scope ON app.client_role_assignments;
CREATE POLICY client_role_assignments_client_scope ON app.client_role_assignments FOR ALL TO ycos_app_runtime
 USING (client_id = app.current_client_id()) WITH CHECK (client_id = app.current_client_id());

REVOKE ALL ON app.platform_users, app.external_identity_mappings, app.client_memberships, app.client_role_assignments FROM PUBLIC;
GRANT SELECT ON app.client_memberships, app.client_role_assignments TO ycos_app_runtime;
RESET ROLE;
