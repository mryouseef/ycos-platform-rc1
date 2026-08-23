# RC1 GitHub Source Reconciliation

## Authoritative export candidate

The export baseline is the reviewed `main` workspace source plus explicitly reviewed ILE controls. Canonical application contents are `app/`, `components/`, `src/`, `infra/`, `tests/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`, `README.md`, and `.github/` ownership rules.

## Classification

| Category | Export treatment |
|---|---|
| Canonical source | Include `app/`, `components/`, `src/` and shared configuration. |
| Approved migrations | Include PN-03 and additive ILE migrations. |
| Test/verification assets | Include `tests/`, `infra/`, and `scripts/`; intentional unsafe fixtures are test data, not credentials. |
| Governance records | Include only reviewed, non-sensitive RC1 and ILE records needed to reproduce the decision context. |
| Deployment configuration | Include sanitized templates only; do not include provider state or secret values. |
| Generated/non-authoritative | Exclude `node_modules/`, `.next/`, logs, provider state, package archives, local clusters, screenshots not approved as governance evidence, and temporary folders. |
| Sensitive/prohibited | Exclude `.env*` values, keys, certificates, credentials, service accounts, tokens, payment data, private logs, database URLs with passwords, real/restricted data, and provider exports. |

## Scan interpretation

The local pooling harness contains a synthetic localhost PostgreSQL URL without a password; it is a non-secret test fixture. Negative test fixtures intentionally contain unsafe marker strings and must remain clearly isolated under `infra/tests/fixtures/`; no actual credential value is included. Existing internal Git history is not exported: the GitHub baseline will use a clean initial commit.
