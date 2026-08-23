# ILE-01 Deployment Plan

**Planning sequence only:**

1. Authorize the minimal managed-PostgreSQL repository and identity/deployment adapters after design review; do not alter RC1 without separate authorization.
2. Configure distinct development, preview, and ILE live environments. Preview has synthetic data only and receives no live ILE secret inheritance.
3. Create managed PostgreSQL roles, TLS-only server connection, migration execution path, and pooling proof before app traffic.
4. Configure Cloudflare DNS/TLS to Vercel only after public-launch authorization. Set controlled edge entry, headers, WAF/rate controls, and explicitly scoped DNS/TLS change authority.
5. Promote only signed/reviewed GitHub changes through build, verify, approve, deploy separation. No arbitrary request migration.
6. Verify health/readiness adapter, application errors, availability, security events, deployment events, database health, backup status, auth failures, privileged actions, canonical audit, and data-admission firewall.

| Environment | Data / secrets | Database | Promotion |
|---|---|---|---|
| Development | local synthetic / development-only | local disposable | developer workflow |
| Preview | synthetic only / branch-scoped | isolated non-live | review only |
| ILE live | restricted-by-default / ILE-scoped | live managed PostgreSQL | explicit launch authorization |

### Domain flow

`User → Cloudflare → Vercel → Application/API → PostgreSQL`. Cloudflare DNS/TLS controls must not expose database endpoints or be interpreted as Saudi database residency.
