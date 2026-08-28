BEGIN;

REVOKE ALL ON TABLE public.users, public.organizations, public.organization_memberships FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ycos_ile_runtime;
GRANT SELECT ON TABLE public.users, public.organizations, public.organization_memberships TO ycos_ile_runtime;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'p1_users_select_bound_identity') THEN
    CREATE POLICY p1_users_select_bound_identity ON public.users
      FOR SELECT TO ycos_ile_runtime
      USING (
        (
          provider_issuer = NULLIF(current_setting('app.provider_issuer', true), '')
          AND provider_subject = NULLIF(current_setting('app.provider_subject', true), '')
        )
        OR id = NULLIF(current_setting('app.actor_id', true), '')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_memberships' AND policyname = 'p1_memberships_select_self') THEN
    CREATE POLICY p1_memberships_select_self ON public.organization_memberships
      FOR SELECT TO ycos_ile_runtime
      USING (user_id = NULLIF(current_setting('app.actor_id', true), ''));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'p1_organizations_select_active_tenant') THEN
    CREATE POLICY p1_organizations_select_active_tenant ON public.organizations
      FOR SELECT TO ycos_ile_runtime
      USING (
        id = NULLIF(current_setting('app.tenant_id', true), '')
        AND EXISTS (
          SELECT 1
          FROM public.organization_memberships AS membership
          WHERE membership.organization_id = organizations.id
            AND membership.user_id = NULLIF(current_setting('app.actor_id', true), '')
            AND membership.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

COMMIT;
