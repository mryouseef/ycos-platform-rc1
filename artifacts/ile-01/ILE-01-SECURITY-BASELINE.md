# ILE-01 Security Baseline

## Identity and administration

Public visitor, demo/test user, and platform administrator are distinct. No public self-registration is assumed. A future live admin requires strong authentication, MFA, server-side authorization, session protection, secure cookies, CSRF protection where applicable, rate limits, canonical audit, and protected privileged routes. Shared administrator accounts are prohibited.

## Secrets and database roles

Provider-managed environment secret mechanisms are the planning target, separated for development, preview, and ILE live. No secret belongs in source, repository, browser, logs, committed `.env`, image, or client bundle. Minimum PostgreSQL roles are migration, application runtime, optional job only when proven, and admin/operations. Runtime has no `BYPASSRLS`; migration authority is never normal runtime authority.

## Pooling and migrations

Supabase documents transaction-mode pooling for serverless/edge functions and cautions that it does not support prepared statements. [1] ILE must use a compatible server-only driver/repository adapter with transaction-scoped tenant initialization and explicit cleanup/reset. Request A context must never survive into Request B; if demonstration fails, ILE-G1 blocks launch. Run migrations through a controlled deployment job using a migration role, migration evidence, schema version traceability, and forward-fix/rollback procedure—not public requests.

## Internet threat controls

Cloudflare rate rules can match endpoints and mitigate abuse but are not precise origin-request quotas. [2] Apply WAF/rate rules to login/admin/API abuse paths, retain application-side validation, CSP/headers, parameterized SQL, safe errors, origin/CSRF controls where applicable, preview secret isolation, dependency review, and SSRF/open-redirect review. No penetration test is claimed.

## References

[1] [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)

[2] [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
