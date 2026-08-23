# ILE-01 Cost Model

No exact monthly amount is approved or inferred. Pricing requires selected capacity, region, retention, traffic, security features, and agreement inputs.

| Area | Class | Planning conclusion |
|---|---|---|
| Vercel | Required | Plan/tier required once request duration, traffic, environment, observability, and commercial limits are selected |
| Supabase PostgreSQL | Required | **Plan/tier requirement:** provider must support ≤1h RPO, ≤4h RTO evidence, TLS, pooling, backup/PITR, connection limits, and required PostgreSQL controls |
| Cloudflare | Required for public edge | DNS/TLS baseline; WAF/rate limits/features may require paid tier depending on chosen controls [1] |
| Domain | Required for branded public launch | Decision required; no domain action authorized |
| Monitoring | Required | Minimum availability/error/security/backup visibility; provider/tool decision required |
| Email | Not required by RC1 | Do not select until product need is proved |
| Object storage | Not required by RC1 | Do not procure until uploads are authorized |

Free-tier reliance is not assumed adequate for a publicly relied-upon service because recovery, retention, concurrency, abuse controls, support, and commercial limits must be verified. The cost class is **DECISION REQUIRED / PLAN-TIER REQUIREMENT**.

## Reference

[1] [Cloudflare rate-limit plan availability](https://developers.cloudflare.com/waf/rate-limiting-rules/)
