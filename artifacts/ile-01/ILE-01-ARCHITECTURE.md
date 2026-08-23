# ILE-01 Interim Launch Architecture

> **Planning only.** No external resource, deployment, real data, real identity, production credential, or billing activation is authorized.

## Proposed boundary

```text
Public user → Cloudflare DNS/TLS/WAF/rate rules → Vercel Next.js application/API
                                                     ↓ server-only TLS database access
                                                Supabase PostgreSQL
GitHub source/CI → controlled Vercel deployment promotion
```

The browser remains limited to application/API access. It receives no PostgreSQL password, Supabase service-role key, or privileged database credential. The application preserves server-derived context and PostgreSQL RLS as defense in depth.

| Layer | ILE role | Classification | Constraint |
|---|---|---|---|
| GitHub | source and controlled CI trigger | PASS WITH CONTROL | Separate development, preview, and live environments |
| Vercel | Next.js build and request runtime | ADAPTER REQUIRED | RC1’s local `psql`/Unix-socket adapter is incompatible with a serverless managed database path |
| Supabase | managed PostgreSQL only | ADAPTER REQUIRED | Server-only TLS client and transaction-safe pooling adapter required |
| Cloudflare | DNS, TLS, WAF, rate controls | PASS WITH CONTROL | Edge does not establish database or application-data residency |

No object storage, email, WebSocket/realtime, scheduled job, external AI, or durable background queue is required by current RC1 evidence. Local temporary PostgreSQL clusters, filesystem staging, `psql` CLI, Unix sockets, hard-coded `postgres` role, and port values are verification-harness assumptions—not acceptable live-runtime dependencies.

## References

[1] [Vercel environment variables](https://vercel.com/docs/environment-variables)

[2] [Supabase PostgreSQL connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres)

[3] [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
