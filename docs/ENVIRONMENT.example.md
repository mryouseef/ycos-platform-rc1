# Sanitized Environment Documentation

This document replaces a conventional `.env.example` inside the protected Manus workspace. It contains **names, purposes, and safe placeholders only**. Real values must be supplied through the target runtime or provider secret-management mechanism and must never be committed to GitHub.

The repository excludes `.env`, `.env.*`, credentials, keys, provider state, and secret exports. A conventional sanitized `.env.example` may be generated outside the Manus protected workspace during an approved deployment or handover process.

| Variable | Required | Consumer | Expected non-secret type / placeholder | Purpose |
|---|---|---|---|---|
| `ILE01_MANAGED_DATABASE_URL` | Required only for a managed PostgreSQL runtime | `src/iaf01/local-runtime.ts`, `src/ile01/managed-postgres.ts` | `<runtime-postgresql-url-with-tls>` | Server-only managed PostgreSQL endpoint. It must require TLS and use the least-privilege runtime role. |
| `ILE01_MANAGED_PG_ALLOW_INSECURE_TEST` | Test-only | ILE local pooling harness | `false` | Allows explicitly local disposable test transport only. It must never be enabled in a deployed environment. |
| `IAF01_PG_SOCKET` | Local PostgreSQL harness only | IAF-01 PostgreSQL harness | `<local-unix-socket-path>` | Synthetic local PostgreSQL socket path. Not used by a managed deployment. |
| `IAF01_PG_PORT` | Local PostgreSQL harness only | IAF-01 PostgreSQL harness | `<local-port>` | Synthetic local PostgreSQL port. Not used by a managed deployment. |
| `YCOS_E2E_HARNESS_ENABLED` | Test-only | End-to-end test controls | `false` | Enables a local synthetic test harness only. It must remain disabled outside controlled testing. |
| `PXSIBASEURL` | Test-only | PXSI browser harness | `<local-test-url>` | Local synthetic browser-test base URL. Never use a buyer-facing or production endpoint. |
| `M10_BASE_URL` | Test-only | M10 test harness | `<local-test-url>` | Local test base URL. |
| `EP13_CONCURRENCY` | Optional test control | EP13 test harness | `<positive-integer>` | Synthetic concurrency-test setting. |
| `EP13_REQUESTS` | Optional test control | EP13 test harness | `<positive-integer>` | Synthetic request-count setting. |
| `BICEP_BIN` | Optional planning/test tool control | Infrastructure planning harness | `<local-tool-path>` | Local planning-only Bicep binary path; no cloud deployment authority. |
| `EXTERNAL_AI_ENABLED` | Control flag | Security/negative tests | `false` | External AI remains denied by policy. |
| `REAL_DATA_ENABLED` | Control flag | Security/negative tests | `false` | Real data remains denied by policy. |
| `RESTRICTED_DATA_ENABLED` | Control flag | Security/negative tests | `false` | Restricted data remains denied by policy. |
| `REAL_SECRET` | Negative-test marker only | Security fixture tests | `<never-set>` | Must never be set in any runtime, GitHub secret, or provider configuration. |
| `NODE_ENV` | Runtime-provided | Node.js / Next.js | `development`, `test`, or `production` | Runtime mode; do not rely on it for business authorization. |
| `PATH` | Operating-system-provided | Local harnesses | `<system-path>` | Operating-system execution path; not an application secret. |

## Secret-management rule

Production-like runtime values, including database connection material and application-session secrets, belong only in a provider-managed secret store or runtime binding after separate authorization. They must not be placed in GitHub variables, committed configuration, browser bundles, logs, screenshots, tests, or documentation.
