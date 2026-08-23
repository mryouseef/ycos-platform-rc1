# ILE-01 Observability Decision

The smallest design uses provider-native deployment/runtime visibility plus structured server-side application events. It must record availability, sanitized application errors, security-significant failures, authentication failures when enabled, deployment events, database health signals, backup status, and privileged action visibility. It must never log passwords, tokens, credentials, connection strings, or sensitive payloads.

No external observability platform is selected or activated. ILE live remains blocked until the selected Vercel/Supabase/Cloudflare plan capability and alert ownership are verified.
