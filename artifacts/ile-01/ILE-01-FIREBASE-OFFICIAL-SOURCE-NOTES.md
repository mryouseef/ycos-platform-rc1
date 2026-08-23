# ILE-01 Firebase App Hosting Official Source Notes

## Firebase App Hosting configuration and runtime

Firebase App Hosting supports framework-aware configuration and documents `apphosting.yaml` as the location for Cloud Run `runConfig`, secret references, build/runtime environment availability, VPC access, and advanced configuration. It describes Cloud Run service settings including concurrency, CPU, memory, maximum/minimum instances, and Cloud Secret Manager secret references. Console environment values override YAML values; runtime-only availability can be narrowed in YAML. App Hosting backend setup includes a GitHub connection, live branch and automatic rollout choice. [1]

App Hosting creates a managed backend; the documented deployment components include Cloud Run configuration, Cloud Build-derived build flow, Artifact Registry images, Cloud Secret Manager references, and Firebase/App Hosting edge delivery. This does not authorize resource creation in ILE-01.

## Custom domain and TLS

Firebase App Hosting supports custom domains and provisions SSL certificates. The official workflow requires DNS record changes at the domain provider; previous-provider A/CNAME records can block certificate provisioning, and Cloud Certificate Manager renewal records must remain. Cloudflare is referenced only as one possible DNS provider, not as a mandatory App Hosting control. [2]

## Supabase recovery and cost boundary

Supabase documents that PITR requires Pro, Team or Enterprise with at least Small compute, and states a worst-case two-minute RPO based on WAL backup behavior. It also states restore downtime varies with database size, backup age and WAL activity; RTO requires measured evidence. Current public pricing lists Pro from $25/month, Small compute at $15/month, and 7-day PITR about $100/month. [3] [4] [5]

## References

[1] [Firebase App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure)

[2] [Firebase App Hosting custom domains](https://firebase.google.com/docs/app-hosting/custom-domain)

[3] [Supabase database backups](https://supabase.com/docs/guides/platform/backups)

[4] [Supabase PITR restore duration guidance](https://supabase.com/docs/guides/troubleshooting/how-long-does-it-take-to-restore-a-database-from-a-point-in-time-backup-pitr-qO8gOG)

[5] [Supabase pricing](https://supabase.com/pricing)
