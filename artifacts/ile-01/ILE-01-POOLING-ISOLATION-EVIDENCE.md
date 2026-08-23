# ILE-01 Pooling and Tenant Isolation Evidence

**Evidence categories:** DATABASE EXECUTION; AUTOMATED TEST; POLICY INSPECTION; ROLE INSPECTION; POOLING TEST; CONCURRENCY TEST.

The additive `infra/ile01/migrations/001_ile_rls.sql` leaves RC1 migration history unchanged. It creates `ycos_ile_runtime` with `NOBYPASSRLS`, grants only tenant-table CRUD, enables and forces RLS, and uses `current_setting('app.tenant_id', true)` in `USING` and `WITH CHECK` policies.

The server-only adapter executes `BEGIN`, verifies that `current_user` does not bypass RLS, executes transaction-scoped `set_config(..., true)`, verifies the resulting context, performs the database operation, then commits or rolls back and releases the connection. Missing, malformed, failed, or bypass-capable context fails closed.

| Executed case | Outcome |
|---|---|
| Tenant A reads A / reads B | ALLOW / ZERO ROWS |
| Tenant A inserts A / inserts B | ALLOW / DENY |
| Tenant A updates A / updates B | ALLOW / ZERO ROWS |
| Tenant A deletes A / deletes B | ALLOW / ZERO ROWS |
| Missing or invalid tenant | ZERO ROWS / DENY |
| Alternating A/B reuse | ZERO cross-tenant access |
| Concurrent A/B requests | ZERO cross-tenant access |
| Rollback context check | context cleared |
| Error/reuse handling | pool connection released after rollback |

The execution used a disposable local PostgreSQL test cluster and an explicit test-only insecure transport flag. This proves transaction/RLS semantics, not a provider TLS endpoint. Live ILE binding refuses a managed URL without `sslmode=require`, `verify-ca`, or `verify-full`.
