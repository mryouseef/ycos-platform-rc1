# ILE-01 Azure Migration Contract

| Interim component | Final mapping | Status | Exit/migration requirement |
|---|---|---|---|
| Vercel Next.js runtime | Azure-approved application runtime | Portable with adapter | No provider-specific business authorization; export environment contract |
| Supabase PostgreSQL | Azure Database for PostgreSQL | Migration required | Schema, roles, RLS, data/audit export, restore rehearsal, connection adapter swap |
| Vercel secrets | Azure Key Vault | Migration required | Rotate secrets; never copy static live secret as-is |
| ILE identity mechanism | Microsoft Entra ID where approved | Adapter required | Preserve app-owned authorization and tenant policy |
| Cloudflare edge | Retain/replace by final authority | Decision required | DNS/TLS cutover, WAF/rule recreation, rollback plan |
| GitHub CI | Approved Azure deployment pipeline | Adapter required | Preserve build/verify/approve/deploy separation and provenance |
| Future object storage | Azure Storage | Migration required | Private export, tenant mapping, signed access, deletion proof |

ILE is disposable. Exit requires PostgreSQL export and schema migration, audit export where required, object export if later enabled, secret rotation, DNS cutover/rollback, provider closure, and deletion verification.
