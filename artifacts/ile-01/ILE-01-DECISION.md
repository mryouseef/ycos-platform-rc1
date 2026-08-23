# ILE-01 Decision

## PASS WITH CONDITIONS — SPECIFIED CONDITIONS REMAIN BEFORE LAUNCH

The proposed GitHub → Vercel → application/API → Supabase PostgreSQL path with Cloudflare edge is a viable **interim planning target**, not a deployable RC1 configuration. RC1 is immutable. The current local adapter invokes `psql` against a Unix socket as `postgres`; this is materially incompatible with Vercel and managed Supabase PostgreSQL and requires a minimal separately authorized managed-PostgreSQL repository adapter. No redesign of PN-01, PN-02, PN-03, IAF-01, or PXSI is authorized by this decision.

The authorized controlled implementation added a server-only `pg` 8.23.0 binding, an optional managed PostgreSQL adapter, one additive ILE RLS migration, and a data-admission fail-closed guard. Actual local PostgreSQL evidence proves runtime role `NOBYPASSRLS`, FORCE RLS, tenant visibility/mutation denial, transaction-scoped context, alternating tenant reuse, concurrency, rollback, error handling, and zero cross-tenant access. The canonical RC1 migration remains unchanged.

Final pre-launch closure sets the minimum safe **configuration recommendation** as Supabase Pro, Small compute and 7-day PITR. Current provider documentation supports RPO ≤1 hour by design but does not prove RTO ≤4 hours; a measured provider restore drill remains mandatory. Live identity/admin/MFA/secret/observability ownership and owner G7 authorization remain conditions. Public launch, external resources, billing, DNS, real data, real identity, and external AI remain prohibited.

## References

[1] [Vercel environment variables](https://vercel.com/docs/environment-variables)

[2] [Supabase PostgreSQL connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres)

[3] [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
