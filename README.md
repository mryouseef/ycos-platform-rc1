# YOUSEF PLATFORM — RC1 Canonical Baseline

This repository contains the reviewed **RC1 local-synthetic baseline** for the YOUSEF PLATFORM and its controlled ILE additions. It is designed to be portable across qualified hosting environments while preserving provider-neutral application, PostgreSQL, RLS, tenant-isolation, and data-admission controls.

## Architecture

The application is a Next.js service with a server-derived application boundary. Canonical contracts and domain behavior live in `src/pn01` and `src/pn02`; PostgreSQL persistence and approved migrations live in `src/pn03` and `infra`; the application-service boundary is in `src/iaf01`; and the optional ILE managed-PostgreSQL binding is isolated in `src/ile01`.

The managed database path requires TLS, a least-privilege runtime role without `BYPASSRLS`, and a transaction-scoped tenant context. It must not be enabled in a deployment until the receiving environment has passed the synthetic RLS, pooling, rollback, concurrency, and data-admission qualification gates.

## Local setup

Use Node.js and pnpm versions compatible with the lockfile. Copy `.env.example` only for local placeholder documentation; never add real values to the repository.

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
```

Local PostgreSQL proof harnesses create disposable synthetic clusters. They do not use real data or hosted credentials.

## Migrations and tests

Canonical schema migration: `infra/pn03/migrations/001_work_items.sql`.

Additive ILE RLS migration: `infra/ile01/migrations/001_ile_rls.sql`.

Run the relevant `tests/`, `infra/`, and `scripts/` checks before approving any runtime environment. The RLS migration is additive; do not rewrite canonical migration semantics without explicit authorization.

## Security invariants

Tenant scope is server-derived. Default deny applies to missing authority. Browser code must not import `pg`, database credentials, privileged roles, or provider secrets. The runtime role must not have `BYPASSRLS`. Restricted and real data remain denied by the ILE data-admission firewall unless a separate authorization is granted.

## Portability and deployment status

GitHub is the planned portable source-of-truth. Provider-specific deployment manifests remain separate from canonical application semantics, SQL migrations, and tests. No Render, Firebase, Azure, Supabase, custom domain, or public deployment is created by this repository baseline.

## Data and secrets

Secrets, credentials, payment data, real/restricted data, provider exports, and `.env` values are not stored in GitHub. Use provider secret stores only after a separately authorized deployment-control gate.
