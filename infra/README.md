# EP-01 Controlled IaC Foundation

This directory is **source and local-validation only**. It contains no real data, real identity, subscription ID, tenant ID, secret, credential, production connection string, state file, or deployment output.

The sole approach is **Bicep 0.46.1**. `bicep build` and local source checks are permitted when the local binary is available. `az deployment`, `what-if` requiring Azure access, and any apply/create operation are out of scope for EP-01.

The design uses a required controlled evaluation region parameter. `regionx` is an intentionally non-authoritative placeholder and must never be treated as Saudi Arabia East availability evidence. F-GO02-01 remains open.

Future apply preconditions include: explicit GO-03 authority, valid controlled region evidence, named authority values, approved subscription scope, no real data or identity, no production commitment, and a separately reviewed deployment identity.
