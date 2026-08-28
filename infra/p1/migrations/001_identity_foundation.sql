BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ycos_ile_runtime') THEN
    RAISE EXCEPTION 'P1-D1 prerequisite role ycos_ile_runtime is missing';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  provider_issuer text NOT NULL CHECK (length(btrim(provider_issuer)) > 0),
  provider_subject text NOT NULL CHECK (length(btrim(provider_subject)) > 0),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_provider_identity_key UNIQUE (provider_issuer, provider_subject)
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  role_code text NOT NULL CHECK (role_code IN ('ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06', 'ROLE-07', 'ROLE-08')),
  status text NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  authority_version integer NOT NULL CHECK (authority_version > 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at timestamptz,
  created_by_user_id text REFERENCES public.users(id) ON DELETE RESTRICT,
  revoked_by_user_id text REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT organization_memberships_user_organization_key UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS users_provider_identity_lookup_idx
  ON public.users (provider_issuer, provider_subject);
CREATE INDEX IF NOT EXISTS organization_memberships_user_status_idx
  ON public.organization_memberships (user_id, status, organization_id);
CREATE INDEX IF NOT EXISTS organization_memberships_organization_status_idx
  ON public.organization_memberships (organization_id, status, user_id);

COMMIT;
