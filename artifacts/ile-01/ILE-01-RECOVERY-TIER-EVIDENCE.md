# ILE-01 Recovery Tier Evidence

Supabase documents direct connections for migrations/`pg_dump`, transaction pooling for serverless application traffic, and managed backup/PITR capabilities at product level. [1] This does **not** by itself prove an ILE project can meet the approved recovery targets.

| Target | Evidence status | ILE requirement |
|---|---|---|
| RPO ≤1 hour | NOT PROVED | Obtain current tier/add-on retention/PITR granularity and backup evidence before ILE live |
| RTO ≤4 hours | NOT PROVED | Perform controlled restore/reconnect/schema/RLS timing qualification before ILE live |
| Backup / restore procedure | DESIGNED | backup verify → restore initiate/complete → reconnect → schema/data/RLS verify → timing/evidence |
| Local recovery semantics | PASS | RC and ILE local synthetic backup/restore evidence exists; provider project evidence remains required |

**Mandatory paid service classification:** recovery-capable Supabase plan/tier or add-on is mandatory for ILE live only if it evidences the targets; no tier is selected or purchased.

## Reference

[1] [Supabase database connectivity and recovery-related operations](https://supabase.com/docs/guides/database/connecting-to-postgres)
