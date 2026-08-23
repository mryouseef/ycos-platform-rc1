# ILE-01 Final Pre-Launch Closure

## Evidence classification

| Topic | Provider-documented capability | Local evidence | Remaining condition |
|---|---|---|---|
| PITR | Pro/Team/Enterprise projects can enable PITR; it requires at least Small compute; WAL is normally archived at two-minute intervals, stated worst-case RPO two minutes [1] | Local synthetic backup/restore and RLS proof | Provider project plan/tier and real restore timing are not configured or measured |
| Restore time | Supabase states downtime varies with database size, full-backup age, and WAL activity [1] [2] | No provider restore drill | RTO ≤4h remains NOT PROVED |
| Daily backup | Pro retains 7 days; Team 14; Enterprise up to 30 [1] | Local recovery semantics | Daily backup alone does not meet the approved RPO objective |
| Cost | Pro starts at $25; Small compute is $15/month; 7-day PITR is about $100/month [3] | No plan selected | Tax, usage, Cloudflare, Vercel and support costs remain variable/unverified |

## Restore drill required after environment availability

| Field | Controlled drill definition |
|---|---|
| Start condition | Approved ILE environment, synthetic tenant A/B data only, named recovery owner, approved change window |
| Source | Supabase PITR point or approved backup before an injected synthetic recovery marker |
| Measurement start | Recovery authorization confirmation and restore initiation timestamp |
| Restore procedure | Isolate access; start restore; wait for provider completion; reconnect through server-only adapter; verify additive RLS migration/runtime role; execute tenant, schema, audit and app-health checks |
| Measurement end | All integrity checks pass and controlled service readiness returns |
| RPO observation | Timestamp gap between last committed synthetic marker and selected restore point |
| RTO observation | End minus measurement start |
| Success criteria | RPO ≤1h, RTO ≤4h, no tenant leak, schema/RLS/role preserved, no secret exposure |
| Failure criteria | Target miss, failed RLS/role/integrity check, tenant leak, or incomplete cleanup |
| Cleanup | Revoke drill access, record evidence, rotate temporary drill credentials if created, remove test artifacts under approved retention |

## Minimum safe launch configuration

The minimum architecture is Vercel application/API, server-only `pg`, Supabase Pro plus **Small compute and 7-day PITR**, Cloudflare DNS/TLS/WAF controls where required, GitHub source controls, and provider-native observability. This is a configuration recommendation, not a purchase or activation.

| Cost item | Classification | Current public evidence |
|---|---|---|
| Supabase Pro organization | CONFIRMED CURRENT PRICE | From $25/month [3] |
| Small compute | CONFIRMED CURRENT PRICE | $15/month [3] |
| 7-day PITR | CONFIRMED CURRENT PRICE | About $100/month [1] [3] |
| Supabase baseline subtotal before credit/tax | VERIFIED PUBLIC COMPONENTS | About $140/month before stated $10 compute credit, tax and usage [1] [3] |
| Vercel / Cloudflare / GitHub | VARIABLE USAGE COST / UNVERIFIED | Select current plan only at G7 review |
| Log drain / advanced MFA / custom domain | OPTIONAL | Do not enable by default [3] |

## Identity, administration, observability and ownership

The selected minimum viable identity mechanism is **server-validated named application sessions with separate administrative class**, not Supabase Auth. Privileged access requires named account, MFA, no shared account, least privilege, server-side authorization independent of client claims, break-glass procedure, audit, expiry/revocation, and controlled elevation. Live configuration evidence is required before launch.

The minimum observability implementation is Vercel runtime/deployment visibility, Supabase health/database signals, Cloudflare edge/security events where enabled, and structured sanitized application/audit events. It must cover errors, API/database/authorization/RLS failures, privileged actions, deployment, health, availability, latency and recovery. Owner, alert routing and escalation are **OWNER ASSIGNMENT REQUIRED**. Logs must exclude passwords, tokens, keys, database URLs, secrets and unnecessary personal/restricted data.

An owner-operated interim deployment may have one named person perform System Owner, Security Owner, Privileged Admin Owner, Database/Recovery Owner, Observability/Incident Owner, and Deployment Owner roles only with logical separation through distinct approval, audit, change, recovery, and break-glass controls. Every named assignment remains **OWNER ASSIGNMENT REQUIRED**.

Environment separation is required: LOCAL has synthetic/local secrets only; PREVIEW/TEST uses isolated test secrets and synthetic data only; PRODUCTION uses distinct least-privilege server-only secrets. No secret is committed to Git; rotation follows provider and incident/change policy; database, admin and deployment credentials remain distinct.

## Gate reconciliation

| Gate | Status | Reason |
|---|---|---|
| ILE-G0 | PASS | RC1 compatibility and optional adapter implemented/tested |
| ILE-G1 | PASS WITH CONTROL | Actual local RLS/pooling proof passes; live provider TLS/context test required at environment qualification |
| ILE-G2 | CONDITION OPEN | Named live identity/admin/MFA/secrets configuration and owner evidence required |
| ILE-G3 | PASS WITH CONTROL | Fail-closed data firewall implemented; no real/restricted data admitted |
| ILE-G4 | CONDITION OPEN | PITR supports RPO by design; RTO requires measured provider restore drill |
| ILE-G5 | CONDITION OPEN | Minimum design selected; live alerting/access/owner evidence required |
| ILE-G6 | CONDITION OPEN | Provider environment, DNS, domain, controls, and deployment evidence not created |
| ILE-G7 | NOT AUTHORIZED | Owner public-launch authorization remains required |

**Final technical verdict:** PASS WITH CONDITIONS. **G7 review readiness:** READY WITH CONDITIONS. No public deployment is authorized by this record.

## References

[1] [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)

[2] [Supabase PITR restore duration guidance](https://supabase.com/docs/guides/troubleshooting/how-long-does-it-take-to-restore-a-database-from-a-point-in-time-backup-pitr-qO8gOG)

[3] [Supabase Pricing](https://supabase.com/pricing)
