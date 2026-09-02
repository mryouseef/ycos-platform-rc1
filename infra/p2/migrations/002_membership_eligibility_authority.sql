-- P2-R01C-v2 — Narrow Membership Eligibility Authority (final, deployable).
-- SYNTHETIC / LOCAL ONLY / NON-PRODUCTION.
-- Additive P2 migration. Does NOT modify infra/p1/migrations/001 or 002.
-- Does NOT alter, drop, or broaden p1_memberships_select_self.
-- Does NOT grant BYPASSRLS to ycos_ile_runtime.
--
-- Problem: P1's only SELECT policy on organization_memberships
-- (p1_memberships_select_self) restricts visibility to the acting
-- user's own membership row. P2 assignment must authoritatively verify
-- a DIFFERENT user's (the target consultant's) membership without
-- broadening that policy or granting general peer visibility.
--
-- Solution: a single-purpose SECURITY DEFINER function owned by a new,
-- minimal, NOLOGIN role with BYPASSRLS. This role has exactly one
-- privilege (SELECT on organization_memberships) and cannot be logged
-- into directly. The function returns ONLY a boolean — never a row,
-- never membership metadata, never enumeration. ycos_ile_runtime is
-- granted EXECUTE on the function only; it is never granted BYPASSRLS
-- itself and its own ordinary SELECT visibility is completely
-- unchanged by this migration.
--
-- R01B correction (final, supersedes R01A's three-argument signature):
-- the function accepts ONLY target_membership_id. Tenant and actor are
-- NEVER caller-supplied arguments — they are derived exclusively from
-- the transaction-local session GUCs (app.tenant_id / app.actor_id)
-- already established and round-trip verified by the calling
-- transaction, eliminating any cross-tenant eligibility oracle. The
-- acting membership must additionally carry ROLE-05 (not merely be
-- ACTIVE), since this primitive exists specifically for consultant
-- assignment and must not be usable by an arbitrary tenant member.

-- R01C-v2 correction (final, honest deployability): the previous R01C
-- attempt (temporary GRANT ycos_p2_eligibility_owner TO postgres, then
-- REVOKE) was DISPROVEN by live evidence in the managed Supabase
-- environment: the membership row is recorded with grantor =
-- supabase_admin, and the postgres migration-executor role has no
-- authority to revoke a membership it did not itself grant as its own
-- true grantor. This is a Supabase-managed-role property, not a SQL
-- ordering defect, and cannot be fixed by rearranging GRANT/REVOKE
-- statements executed as postgres.
--
-- Therefore this migration, which runs entirely as the ordinary
-- postgres migration executor, deliberately STOPS SHORT of reassigning
-- function ownership. It performs every step postgres CAN legally and
-- reversibly perform:
--   - create the dedicated NOLOGIN/BYPASSRLS owner role (role creation
--     itself was NOT the failing step in the live qualification;
--     only the subsequent membership REVOKE was);
--   - grant it exactly the one required table-level SELECT;
--   - revoke schema CREATE from it defensively;
--   - create the function (owned, for now, by postgres — the ordinary
--     migration executor, NOT by ycos_ile_runtime);
--   - revoke PUBLIC EXECUTE and grant ycos_ile_runtime EXECUTE only.
--
-- The ONE remaining step — ALTER FUNCTION ... OWNER TO
-- ycos_p2_eligibility_owner — is deliberately NOT included here. It is
-- isolated in 003_MANUAL_PRIVILEGED_ownership_transfer.sql, which must
-- be executed once via a connection that genuinely holds supabase_admin
-- authority (Supabase support channel, or any Supabase-provided
-- privileged execution path — NOT the standard postgres migration
-- connection string). See that file's header for the exact prerequisite.
--
-- Interim behavior while ownership still sits with postgres: FORCE ROW
-- LEVEL SECURITY on organization_memberships applies to the table
-- owner unless the owner holds BYPASSRLS. If postgres does not itself
-- carry BYPASSRLS (the ordinary case), the function FAILS CLOSED — it
-- always returns false, denying every assignment — until the manual
-- privileged step completes. This is a safe, non-functional gate, not
-- a security regression: no eligibility can be wrongly granted in the
-- interim state, only wrongly withheld.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ycos_p2_eligibility_owner') THEN
    CREATE ROLE ycos_p2_eligibility_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END $$;

-- The owner role needs exactly this one table-level grant to satisfy
-- its query inside the function body. BYPASSRLS handles row visibility;
-- this GRANT is the separate, mandatory table-level permission.
GRANT SELECT ON public.organization_memberships TO ycos_p2_eligibility_owner;

-- Defensive/explicit: the owner role must never hold CREATE on the public
-- schema. Harmless if PUBLIC never granted it (PostgreSQL 15+ default);
-- explicit for deployability on older/differently-configured instances.
REVOKE CREATE ON SCHEMA public FROM ycos_p2_eligibility_owner;

-- R01C-v2: temporary role-membership grant/revoke to postgres was
-- REMOVED — proven non-reversible under managed Supabase (see header
-- comment above). The function is created here still owned by
-- postgres; ownership transfer is deferred to the separate, manually
-- executed 003_MANUAL_PRIVILEGED_ownership_transfer.sql.

CREATE OR REPLACE FUNCTION public.p2_is_consultant_membership_eligible(
  target_membership_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  authoritative_tenant text;
  authoritative_actor text;
  actor_authorized boolean;
  target_eligible boolean;
BEGIN
  -- R01B: tenant/actor are NEVER accepted as caller-supplied arguments.
  -- They are derived exclusively from the transaction-local session GUCs
  -- already established and round-trip verified by
  -- P2PostgresRepository.transaction() before this function is ever
  -- invoked. This removes the cross-tenant eligibility oracle risk.
  authoritative_tenant := NULLIF(current_setting('app.tenant_id', true), '');
  authoritative_actor := NULLIF(current_setting('app.actor_id', true), '');

  IF authoritative_tenant IS NULL OR authoritative_actor IS NULL
     OR target_membership_id IS NULL OR btrim(target_membership_id) = '' THEN
    RETURN false;
  END IF;

  -- ACTOR: must hold an ACTIVE ROLE-05 membership in the transaction's own
  -- tenant. R01B narrows this from "any ACTIVE tenant member" to
  -- specifically the P2 assignment-authorized role, so the primitive
  -- cannot be used successfully by an arbitrary ACTIVE tenant member.
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = authoritative_actor
      AND organization_id = authoritative_tenant
      AND status = 'ACTIVE'
      AND role_code = 'ROLE-05'
  ) INTO actor_authorized;

  IF NOT actor_authorized THEN
    RETURN false;
  END IF;

  -- TARGET: must exist, belong to the SAME transaction-local tenant, be
  -- ACTIVE, and carry ROLE-04. Foreign-tenant, nonexistent, inactive, and
  -- wrong-role targets are structurally indistinguishable here — all
  -- collapse to the same boolean false, with zero metadata returned.
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE id = target_membership_id
      AND organization_id = authoritative_tenant
      AND status = 'ACTIVE'
      AND role_code = 'ROLE-04'
  ) INTO target_eligible;

  RETURN target_eligible;
END;
$fn$;

-- R01C-v2: ownership stays with postgres (the migration executor) at
-- the end of THIS migration. Reassignment to ycos_p2_eligibility_owner
-- happens ONLY in 003_MANUAL_PRIVILEGED_ownership_transfer.sql, run
-- once via a genuinely privileged (supabase_admin-capable) connection.
REVOKE ALL ON FUNCTION public.p2_is_consultant_membership_eligible(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.p2_is_consultant_membership_eligible(text) TO ycos_ile_runtime;

-- Structural strengthening authorized in P2-R01A §7: owner/manager membership
-- references now have a real FK to the P1 global membership primary key.
-- This is a plain FK on organization_memberships(id) (already globally
-- unique via its PRIMARY KEY) — it requires no RLS change and proves
-- EXISTENCE, not tenant-match or role (those are guaranteed instead by
-- construction: owner/manager membership ids are only ever taken from
-- context.membershipId, never client input — see P2-R01 report §5 for the
-- documented residual time-of-check/time-of-use invariant).
ALTER TABLE public.consulting_requests
  ADD CONSTRAINT consulting_requests_owner_membership_fk
  FOREIGN KEY (owner_membership_id) REFERENCES public.organization_memberships (id);

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_manager_membership_fk
  FOREIGN KEY (manager_membership_id) REFERENCES public.organization_memberships (id);

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_consultant_membership_fk
  FOREIGN KEY (consultant_membership_id) REFERENCES public.organization_memberships (id);

COMMIT;
