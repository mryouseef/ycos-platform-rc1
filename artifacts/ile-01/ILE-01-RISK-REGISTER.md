# ILE-01 Risk Register

| ID | Risk | Class | Required treatment |
|---|---|---|---|
| ILE-R1 | RC1 local `psql`/socket adapter cannot run on Vercel/Supabase | BLOCKER | Separately authorize and prove server-only managed PostgreSQL adapter |
| ILE-R2 | Transaction pooling leaks tenant context | BLOCKER | Begin/set-local/use/commit-or-rollback/reset proof with alternating tenant test |
| ILE-R3 | Supabase tier cannot support Packet A recovery | DECISION REQUIRED | Verify plan/tier PITR, backup, restore, and support evidence |
| ILE-R4 | Public ILE receives restricted/real data | PASS WITH CONTROL | Technical admission firewall and restricted-by-default operations |
| ILE-R5 | Preview inherits live credentials/data | BLOCKER | Strict environment secret/database separation |
| ILE-R6 | Admin surface becomes public privileged access | PASS WITH CONTROL | MFA, authorization, audit, rate/WAF, secure session controls |
| ILE-R7 | Cloudflare edge is mistaken for Saudi residency | PASS WITH CONTROL | Surface-specific residency register and transfer denial |
| ILE-R8 | Interim provider becomes permanent by inertia | PASS WITH CONTROL | Migration contract, export, DNS cutover, deletion, and Azure target tracking |
| ILE-R9 | External AI activates through convenience | PASS | Disabled/gated; not authorized |
