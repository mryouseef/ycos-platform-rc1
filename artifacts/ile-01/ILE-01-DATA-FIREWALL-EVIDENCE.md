# ILE-01 Data Admission Firewall Evidence

ILE is restricted-by-default. The required capability names are `REAL_DATA_ENABLED=false`, `RESTRICTED_DATA_ENABLED=false`, and `EXTERNAL_AI_ENABLED=false`, or an equivalent server-only fail-closed configuration. Ordinary users cannot change them. Uploads, bulk export, unapproved integrations, confidential client records, and external AI processing remain disabled/gated.

The current application has no approved restricted upload, integration, object-storage, realtime, queue, or external-AI feature. This evidence is code/configuration review; no live data admission occurred.
