-- P2 CORE CONSULTING WORKFLOW — additive migration only.
-- SYNTHETIC / LOCAL ONLY / NON-PRODUCTION.
-- Reuses the P1 tenant/runtime posture: organizations = tenant, session-local
-- app.tenant_id / app.actor_id, runtime role ycos_ile_runtime, RLS + FORCE RLS.
-- Does NOT alter public.users, public.organizations, public.organization_memberships,
-- work_items, or any historical migration.

BEGIN;

CREATE TABLE public.consulting_requests (
  id text NOT NULL,
  tenant_id text NOT NULL REFERENCES public.organizations (id),
  owner_membership_id text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
  state text NOT NULL CHECK (state IN ('DRAFT', 'SUBMITTED', 'REVIEW', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'CLOSED')),
  version integer NOT NULL CHECK (version > 0),
  classification text NOT NULL CHECK (classification = 'synthetic'),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE public.consultations (
  id text NOT NULL,
  tenant_id text NOT NULL REFERENCES public.organizations (id),
  request_id text NOT NULL,
  manager_membership_id text NOT NULL,
  consultant_membership_id text,
  state text NOT NULL CHECK (state IN ('PROPOSED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED')),
  version integer NOT NULL CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  -- UNIQUE(tenant_id, request_id) is the structural replay guard for P2-E:
  -- a second "establish consultation" attempt for the same accepted request
  -- cannot create a second row; it must hit this constraint.
  UNIQUE (tenant_id, request_id),
  FOREIGN KEY (tenant_id, request_id) REFERENCES public.consulting_requests (tenant_id, id)
);

CREATE TABLE public.p2_audit_events (
  id text NOT NULL,
  tenant_id text NOT NULL REFERENCES public.organizations (id),
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('request', 'consultation')),
  resource_id text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('ALLOW', 'DENY', 'CONFLICT')),
  reason_code text,
  correlation_id text NOT NULL,
  previous_state text,
  requested_state text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

REVOKE ALL ON TABLE public.consulting_requests, public.consultations, public.p2_audit_events FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.consulting_requests, public.consultations TO ycos_ile_runtime;
GRANT SELECT, INSERT ON TABLE public.p2_audit_events TO ycos_ile_runtime;

ALTER TABLE public.consulting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.p2_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2_audit_events FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consulting_requests' AND policyname = 'p2_requests_tenant_isolation') THEN
    CREATE POLICY p2_requests_tenant_isolation ON public.consulting_requests
      FOR ALL TO ycos_ile_runtime
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultations' AND policyname = 'p2_consultations_tenant_isolation') THEN
    CREATE POLICY p2_consultations_tenant_isolation ON public.consultations
      FOR ALL TO ycos_ile_runtime
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'p2_audit_events' AND policyname = 'p2_audit_tenant_isolation') THEN
    CREATE POLICY p2_audit_tenant_isolation ON public.p2_audit_events
      FOR ALL TO ycos_ile_runtime
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;
END $$;

COMMIT;
