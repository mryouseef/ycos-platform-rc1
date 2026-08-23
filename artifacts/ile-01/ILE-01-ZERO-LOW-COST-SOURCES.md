# ILE-01 Zero / Low-Cost Alternatives — Official Sources

## Firebase Spark Hosting

Firebase documents that original Firebase Hosting is optimized for static and single-page applications. Dynamic server behavior requires Cloud Functions or Cloud Run. Firebase’s App Hosting comparison states that original Hosting can use the Spark plan, while App Hosting requires Blaze; it explicitly positions App Hosting for full-stack, server-rendered Next.js applications.

**Implication:** Spark Hosting alone cannot preserve RC1 server-side `pg`, managed database credential isolation, transaction-scoped tenant context, RLS execution, or server-validated application APIs. Adding a dynamic backend would require Cloud Run or Functions, which reintroduces billing/Blaze.

## Firebase Blaze App Hosting

Firebase’s official comparison states App Hosting deploys full-stack frameworks using Cloud Build, Cloud Run, and Cloud CDN, supports Next.js, uses GitHub integration, and scales Cloud Run to zero when idle. It also states that App Hosting requires Blaze.

**Implication:** Strong technical fit but it requires a Google Cloud billing relationship and usage-based cost controls.

## Render Alternative

Render’s official pricing lists a $0 Hobby workspace and $0 Free web-service compute tier for Node applications. The official free-tier documentation says a free web service spins down after 15 minutes idle, has an ephemeral filesystem, 750 monthly free instance hours, included bandwidth/build limits, may be suspended if service-initiated outbound traffic is unusually high, and can be restarted at any time. Render documents build/deploy support, environment variables and secret files, Git integration, TLS, health checks, log streams, rollbacks, and a free web-service instance type.

**Implication:** A Render Free web service is the strongest zero-cost candidate for RC1 synthetic technical qualification because it can execute a standard server-side Node/Next process and hold server-only environment variables. However, its outbound PostgreSQL traffic to Supabase may trigger an anti-abuse suspension; cold starts, free-hour limits, restarts, public endpoint exposure, and lack of production operational controls prevent it from qualifying as a production or real-data architecture.

## Sources

1. [Firebase Hosting documentation](https://firebase.google.com/docs/hosting)
2. [Firebase: App Hosting vs original Hosting](https://firebase.blog/posts/2024/05/app-hosting-vs-hosting/)
3. [Render pricing](https://render.com/pricing)
4. [Render free-tier documentation](https://render.com/docs/free)
