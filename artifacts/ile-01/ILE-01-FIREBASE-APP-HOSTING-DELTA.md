# ILE-01 Firebase App Hosting Deployment Delta

## Decision

Firebase App Hosting is **suitable after specified controls** for the ILE path. RC1 remains immutable. Firebase changes the proposed hosting runtime only; it does not change the server-only `pg` adapter, additive RLS/FORCE RLS layer, `NOBYPASSRLS` role, transaction-scoped tenant context, data firewall, or Azure portability contract.

| RC1 / ILE capability | Firebase App Hosting assessment | Status | Required control |
|---|---|---|---|
| Next.js, SSR and API routes | App Hosting is designed for framework-aware web backends and exposes Cloud Run service configuration through `apphosting.yaml` [1] | PASS WITH CONTROL | Use supported App Hosting framework build; verify generated backend after a future non-public environment exists |
| pnpm / build command | Framework inference is preferred; custom command override disables framework optimizations [1] | PASS WITH CONTROL | Retain lockfile; do not override build unless Firebase compatibility testing proves it necessary |
| Server-only `pg` | Cloud Run-backed server process can bind runtime secrets; browser import remains prohibited | PASS WITH CONTROL | Runtime-only secret, TLS, pool limit, no `NEXT_PUBLIC_` prefix |
| Supabase PostgreSQL | External TLS connection is architecturally compatible but no Firebase-to-Supabase test environment exists | UNVERIFIED | Future ILE environment must prove endpoint, TLS, transaction pool context and RLS unchanged |
| RLS / tenant isolation | Existing actual local PostgreSQL proof remains valid | PASS WITH CONTROL | G1 requires runtime proof with Firebase process concurrency before public launch |
| Filesystem/background jobs | App Hosting deploy is Cloud Run managed; no durable local filesystem or background worker is approved | PASS WITH CONTROL | No file-backed state, no in-process scheduler, no migration at request/startup |
| Deployment migration | App Hosting release must not auto-run schema changes | PASS WITH CONTROL | Explicit migration job/change approval before rollout |

## Actual runtime model

Firebase App Hosting is the orchestration layer. Official documentation describes managed App Hosting backends using GitHub, Cloud Build-derived builds, Cloud Run runtime configuration, Artifact Registry images, Cloud Secret Manager references, and managed edge delivery. Cloud Run is therefore a required underlying runtime component, not an independently selected replacement. Cloud CDN behavior is platform-managed; no separate Cloud CDN configuration is required by this ILE decision. Secret Manager is required for server secrets. [1]

## Secrets and environment model

| Environment | Secret boundary | Deployment boundary |
|---|---|---|
| LOCAL | local synthetic variables only | developer machine; no live Supabase URL |
| TEST/PREVIEW | test-only Secret Manager versions and test database credentials | non-live branch/backend; no inheritance of ILE-LIVE secrets |
| ILE-LIVE | Cloud Secret Manager runtime-only references | live branch/backend only; `DATABASE_URL`, runtime role credential and admin secrets server-only |

Firebase allows build-only or runtime-only variable availability, and `apphosting.yaml` secret references to Cloud Secret Manager. Console values override YAML configuration, so live secret writes need owner-reviewed change control. [1] No secret belongs in GitHub, client code, `NEXT_PUBLIC_*`, logs, Firebase public config, or deployment output.

## Identity and privileged administration

The recommended minimum remains **server-validated application sessions with separate named administrative identities**, rather than adding Firebase Authentication merely because Firebase hosts the app. This is smaller, avoids a new identity authority, and preserves eventual Microsoft Entra migration. Firebase/GCP administrative access must use named accounts, MFA, least privilege, no shared privileged account, break-glass procedure, audit, revocation and owner assignment. Live provider configuration is a condition, not a PASS.

## Observability and security

Minimum provider-native observability is Cloud Run/App Hosting deployment/runtime visibility, Cloud Logging/Error Reporting/Monitoring as configured by the future environment, Supabase database signals, and sanitized application audit events. It must record availability, API/database/authz/RLS failures, deployment, privileged actions and recovery without secrets, tokens, credentials or unnecessary personal/restricted data.

Firebase App Hosting custom domains include certificate provisioning and edge delivery. Cloudflare is **NOT REQUIRED** at baseline: Firebase can provide custom-domain TLS/managed certificate handling. Cloudflare remains OPTIONAL only if a later measured abuse/WAF/DNS requirement cannot be met by Firebase/Google controls. DNS must not change under this delta. [2]

Minimum exposure controls remain security headers, rate-limit/abuse control decision, admin route authorization, server-only secrets, restricted deployment access, preview isolation, dependency review and audit logging. Any control not supplied by App Hosting must be implemented at the smallest Google-native or application layer after separate authorization.

## GitHub, recovery, cost and Azure migration

GitHub remains authoritative. Recommended future flow: protected source branch → reviewed deployment/live branch → App Hosting rollout; pull requests must map to preview/test only, with no live database credential inheritance. Rollback is a reviewed App Hosting rollout rollback plus unchanged database recovery/change policy.

Supabase recovery conclusion is unchanged: Pro + Small compute + seven-day PITR supports the approved RPO by design; RTO ≤4 hours is not proved; restore drill is required. Firebase application recovery means rebuild/redeploy a known Git commit and rebind approved runtime-only secrets after database recovery.

| Cost area | Classification |
|---|---|
| Firebase / Google | UNVERIFIED / usage-variable until account, region, App Hosting and Cloud Run configuration are chosen |
| Supabase Pro + Small + seven-day PITR | Public components about $130/month before tax/usage based on published components [3] [4] |
| GitHub | UNVERIFIED / organization-plan dependent |
| Cloudflare | OPTIONAL / NOT REQUIRED |

Portability mapping remains: GitHub retained; Firebase App Hosting/Cloud Run/Build/Secret Manager → approved Azure runtime/CI/Key Vault; Supabase PostgreSQL → Azure Database for PostgreSQL; temporary session model → Microsoft Entra when approved; Google observability → Azure monitoring. Firebase-specific coupling is limited to `apphosting.yaml`, App Hosting/GCP IAM, Secret Manager references and rollout configuration; keep application adapters, migrations and GitHub workflow provider-neutral.

## Affected gate delta

| Gate | Delta status |
|---|---|
| G0 | PASS WITH CONTROL — Firebase framework/runtime compatibility requires future non-public backend proof |
| G1 | PASS WITH CONTROL — preserve existing proof; Firebase concurrency/TLS/pool test required later |
| G2 | CONDITION OPEN — named Firebase/GCP administration, MFA, secret access and session configuration required |
| G3 | PASS WITH CONTROL — no contradiction to data firewall |
| G4 | CONDITION OPEN — Supabase status unchanged; Firebase redeployment exercise required in restore drill |
| G5 | CONDITION OPEN — Google-native signal, access, retention, owner and alert proof required |
| G6 | CONDITION OPEN — GitHub/App Hosting backend, environment, secret, DNS and rollback evidence required |
| G7 | NOT AUTHORIZED |

## References

[1] [Firebase App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure)

[2] [Firebase App Hosting custom domains](https://firebase.google.com/docs/app-hosting/custom-domain)

[3] [Supabase database backups](https://supabase.com/docs/guides/platform/backups)

[4] [Supabase pricing](https://supabase.com/pricing)
