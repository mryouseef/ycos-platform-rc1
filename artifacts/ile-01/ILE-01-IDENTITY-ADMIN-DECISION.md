# ILE-01 Identity and Privileged Admin Decision

The smallest safe interim decision is **server-validated application sessions with separate public, user, and named administrator classes**, not Supabase Auth and not university Microsoft 365 dependency. Production identity-provider activation remains a later authorization.

Administrative requirements are MFA, named account, no shared admin, server-side authorization, protected privileged routes, session expiration/revocation, secure-cookie and CSRF design where applicable, rate protection, and canonical audit. Authentication never grants business authorization by itself. No live identity service, account, credential, or MFA enrollment was created in ILE-01.
