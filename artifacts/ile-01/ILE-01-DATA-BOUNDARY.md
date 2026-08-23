# ILE-01 Data Boundary and Admission Firewall

ILE-01 is **restricted-by-default** and **real-data denied by default**. It may contain only synthetic/demo data, public content, non-sensitive configuration, and later explicitly authorized low-risk operational metadata. Student records, university operations data, restricted/high-sensitivity data, real client confidential records, and business-supplied credentials remain prohibited.

| Control | ILE planning baseline |
|---|---|
| Environment capability | `ILE_MODE` design flag; deny restricted/real-data features unless an explicit future authority permits them |
| Uploads | Disabled until a storage, tenant-scope, validation, malware, retention, and migration design is authorized |
| Integrations | Disabled; no external AI and no business-data connectors |
| Admin | No capability to enable restricted data classes from a public control surface |
| Audit/logs | Exclude sensitive payloads, credentials, tokens, database URLs, and unrestricted identifiers |
| Transfer | Deny cross-border data transfer; Cloudflare edge placement is not database/app-data residency |
| Provider data surfaces | Evaluate Vercel runtime/logs, Supabase database/backups, Cloudflare edge/logs, GitHub repository/CI separately |

The firewall must be technical as well as documentary: environment capability flags, feature gates, restricted admin actions, upload/integration disablement, and AI disablement. Unknown data receives the more restrictive treatment.
