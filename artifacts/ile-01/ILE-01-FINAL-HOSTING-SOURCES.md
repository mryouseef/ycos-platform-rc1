# ILE-01 Final Hosting Decision — Official Source Notes

## Render Paid Web Service

- Render documents a **Hobby workspace at $0/month plus compute** and a **Pro workspace at $25/month plus compute**. A paid Web Service **Starter** instance costs **$7/month**, has **512 MB RAM and 0.5 CPU**. Standard is $25/month with 2 GB RAM/1 CPU.
- Hobby includes 5 GB monthly bandwidth, then $0.15/GB; Pro includes 25 GB, then $0.15/GB. Hobby includes 500 build minutes/month, then $5/1,000 minutes; Pro includes 1,000 minutes/month, then $5/1,000 minutes.
- Paid compute is billed by provisioned resources and prorated by the second. A paid service does not rely on free-tier sleeping, but its provisioned compute creates a fixed monthly service charge while active.
- Every Web Service supports Node runtimes, native builds, environment variables/secret files, health checks, service metrics, notifications, log streaming, fully managed TLS, DDoS protection, zero-downtime deploys, and instant rollbacks. It requires binding to `0.0.0.0` and the `PORT` variable (default 10000). The service is public at an `onrender.com` subdomain; a private service is required for a non-internet-reachable service.
- A deployment from Git needs GitHub/GitLab/Bitbucket connection; it builds from a selected branch using build and start commands. Render supports automatic deploys after CI checks and manual deploys/rollbacks. Its filesystem is ephemeral by default. On replacement, it sends SIGTERM, permits graceful shutdown, then SIGKILL after a default 30 seconds.

## Firebase App Hosting / Blaze

- Firebase App Hosting requires Blaze/pay-as-you-go for the created Firebase project. App Hosting is positioned for full-stack Next.js and uses managed Cloud Build/Cloud Run/CDN-related infrastructure. Current cost cannot be fixed from preflight because region/runtime/services/build/log/artifact/egress choices are not visible before Blaze.

## Supabase Sales Demo Database

- Supabase Free is $0/month: 500 MB shared database, 500 MB RAM, 5 GB egress, and pausing after one week of inactivity. It is adequate only for a limited synthetic qualification and does not give always-on sales-demo availability.
- Supabase Pro starts at $25/month, includes one $10 Micro compute credit, 8 GB disk, 250 GB egress, 7-day daily-backup retention, and does not pause projects. Compute is billed per project. Current pricing shows Micro $10/month and Small $15/month. PITR is an optional $100/month per seven days.
- A persistent buyer-facing synthetic sales demo should use Supabase Pro + included Micro for $25/month before tax/optional add-ons. PITR and Small compute are not technically required just for a demo.

## Cloudflare (closed candidate; context only)

- Cloudflare Next.js Workers support requires OpenNext, Wrangler config, Node compatibility, Worker bindings, and deployment adaptation. RC1 currently lacks those artifacts and uses `createRequire`/`pg` server runtime behavior. Hyperdrive is transaction pooled; it resets SET state when a connection returns to the pool. Deployed RLS/pooling proof is mandatory and Cloudflare is excluded from the final comparison.

## Sources

1. https://render.com/pricing
2. https://render.com/docs/web-services
3. https://render.com/docs/deploys
4. https://supabase.com/pricing
5. https://firebase.google.com/docs/app-hosting/overview
6. https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
7. https://developers.cloudflare.com/hyperdrive/concepts/how-hyperdrive-works/
