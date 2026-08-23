# ILE-01 Launch Gates

| Gate | Requirement | Current planning status |
|---|---|---|
| ILE-G0 RC1 compatibility | Managed-PostgreSQL, identity, health, and non-persistent-runtime adapters reviewed/authorized | ADAPTER REQUIRED |
| ILE-G1 Database / RLS / pooling | TLS, roles, no `BYPASSRLS`, transaction-scoped context/reset, alternating-tenant proof | BLOCKER UNTIL PROVED |
| ILE-G2 Security / identity / secrets | MFA admin, environment secrets, session/admin protection, WAF/rate controls | DECISION REQUIRED |
| ILE-G3 Data-admission controls | Restricted-by-default capability gate and no restricted/real data | PASS WITH CONTROL |
| ILE-G4 Backup / recovery | Provider tier demonstrably supports ≤1h RPO / ≤4h RTO, restore evidence | PLAN/TIER REQUIREMENT |
| ILE-G5 Observability / audit | Errors, availability, security, backup, DB health, canonical audit and minimized logs | ADAPTER REQUIRED |
| ILE-G6 Deployment readiness | Controlled migrations, preview separation, DNS/TLS, rollback, dependency review | DECISION REQUIRED |
| ILE-G7 Public launch authorization | Formal owner/security/data/release launch approval | NOT AUTHORIZED |

No public launch is allowed until every mandatory gate passes.
