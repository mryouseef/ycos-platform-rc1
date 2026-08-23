# ILE-01 Controlled Implementation

## Authorized change boundary

The only canonical binding changed is `src/iaf01/local-runtime.ts`, which now selects a managed PostgreSQL repository only when `ILE01_MANAGED_DATABASE_URL` is explicitly present. Existing local `psql`/Unix-socket behavior remains the default. The new `src/ile01/managed-postgres.ts` is an ILE deployment adapter and is removable for Azure migration.

`pg` 8.23.0 was added as the sole authorized runtime dependency. Production audit reported zero known findings at execution time. The adapter is server-only: searches found zero `pg` imports under client/UI paths; URLs and credentials are never returned by API responses or placed in browser code.

## Required configuration names only

| Name | Purpose | Exposure rule |
|---|---|---|
| `ILE01_MANAGED_DATABASE_URL` | Server-only managed PostgreSQL URL | ILE live secret only; TLS mode required outside a test-only harness |
| `ILE01_MANAGED_PG_ALLOW_INSECURE_TEST` | Explicit local synthetic test exception | Never ILE live; never browser |
| `REAL_DATA_ENABLED` | Data-admission capability | Must remain `false` for ILE |
| `RESTRICTED_DATA_ENABLED` | Restricted-data capability | Must remain `false` for ILE |
| `EXTERNAL_AI_ENABLED` | AI capability | Must remain `false` for ILE |

No value is recorded in source, report, artifact, or test output.
