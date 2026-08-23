# ILE-01 Cloudflare Workers Compatibility Delta — Official Sources

## Next.js and OpenNext

Cloudflare documents that Next.js applications can deploy to Workers through the OpenNext adapter. The supported table includes App Router, route handlers, React Server Components, SSR, ISR, Server Actions, middleware, and streaming. The documented existing-project path requires `@opennextjs/cloudflare`, `wrangler`, a Wrangler configuration, an OpenNext configuration, and Node compatibility. Node.js middleware is listed as unsupported. The current RC1 uses Next 16.3.1, App Router and route handlers; no Node.js middleware was found in the reviewed source.

## RC1 Driver / Runtime Constraint

The actual ILE adapter imports `createRequire` from `node:module` and dynamically loads `pg`, then uses `Pool`, TLS URL validation, `BEGIN`, transaction-local tenant context, role checking, `COMMIT`/`ROLLBACK`, and client release. Cloudflare documents `pg`/node-postgres as a recommended Hyperdrive driver, requiring Node compatibility and a current compatibility date. Cloudflare also documents partial support for `node:module`, which means the existing `createRequire` implementation requires an adapter rewrite/qualification before deployment; no runtime test occurred.

## PostgreSQL and Hyperdrive

Cloudflare documents Hyperdrive as the recommended path for Workers PostgreSQL connectivity, with connection pooling and query caching. It supports node-postgres/`pg`; it provides a binding-supplied connection string and requires a Hyperdrive resource/binding. Hyperdrive transaction mode assigns one connection for a transaction and resets `SET` state when returned to the pool. Cloudflare states that one Worker invocation may obtain multiple connections and any transaction/query configuration must be set for every query or transaction.

**RC1 implication:** the current explicit `BEGIN → set_config(..., true) → operation → COMMIT/ROLLBACK` model aligns with transaction-local context, but deployed adversarial proof against actual Hyperdrive and Supabase remains mandatory. Query cache must be disabled for tenant-scoped/read-after-write WorkItem queries; documentation alone does not prove connection-error or concurrent-request isolation with Supabase.

## Direct TCP

Workers provide outbound TCP sockets and can use TLS. Cloudflare recommends Hyperdrive for PostgreSQL. Direct TCP connections cannot be global/shared across requests and must be created in a handler. This is technically possible but not the preferred pooled design for RC1.

## Secrets

Cloudflare Worker secrets are encrypted bindings available to server code through `env` or `process.env` when Node compatibility applies. Cloudflare explicitly says not to store sensitive data in Wrangler plaintext variables or commit `.env`/`.dev.vars` files. Adding or changing deployed secrets creates a Worker version/deployment; no secret was created in this review.

## Pricing

Workers Free: 100,000 requests/day and 10 ms CPU/invocation; static asset requests are free. Workers Paid: a confirmed minimum **$5 USD/month**, 10 million requests/month, 30 million CPU ms/month, with no data-transfer/egress charges stated for Workers. Workers logs Free: 200,000 events/day with 3-day retention; Paid: 20 million included events/month, then $0.60/million with 7-day retention. Hyperdrive is included in both plans: Free is 100,000 database statements/day; Paid is unlimited. Hyperdrive pooling and caching are included, with no Hyperdrive egress charge stated.

## Sources

1. [Cloudflare Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
2. [Cloudflare Hyperdrive PostgreSQL connection](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/)
3. [Cloudflare Hyperdrive connection behavior](https://developers.cloudflare.com/hyperdrive/concepts/how-hyperdrive-works/)
4. [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
5. [Cloudflare Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/)
6. [Cloudflare Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
7. [Cloudflare TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
8. [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
