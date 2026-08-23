# ILE-01 Blaze Cost-Governance Preflight

**Scope:** Read-only assessment. No billing account was created or associated; no Blaze upgrade, payment-method change, API/service enablement, App Hosting backend, GitHub connection, IAM grant, secret, Supabase connection, or deployment was performed.

## Current Provider State

The Firebase App Hosting page for `ycos-ile-np-ksa` displays the **Spark** plan and states that App Hosting requires a pricing-plan upgrade. This establishes that a Blaze billing transition is a prerequisite to App Hosting backend creation, but it does not create a billing association by itself.

## Official Cost-Control Findings

Google Cloud budgets and budget alerts provide monitoring and threshold notifications; an alerts-only budget is **not** a hard spending cap and does not automatically stop usage or billing. Google Cloud documents optional spend-cap budgets for eligible services. Firebase documents that Firebase App Hosting may use a spend cap on the underlying Cloud Run service, but cautions that spend caps are not instantaneous hard caps because cost reporting has latency. A triggered spend cap blocks new usage for the specific covered service until manually lifted.

Google Cloud also documents programmatic budget notifications that can drive a response such as disabling Cloud Billing, but such automation must be separately designed, approved, and tested; it is not present in the current project.

## Billing-Account Boundary

A Google Cloud Billing account tracks charges for linked Firebase/Google Cloud projects and is associated with a Google payments profile and payment instrument. Associating the project to a billing account is the first committing action; the account itself tracks costs rather than imposing a documented fixed recurring project fee. Actual charges begin when billable services/resources consume priced usage.

## Sources

1. [Firebase: Avoid surprise bills](https://firebase.google.com/docs/projects/billing/avoid-surprise-bills)
2. [Google Cloud: Budgets and budget alerts](https://cloud.google.com/billing/docs/how-to/budgets)
3. [Google Cloud: Billing overview](https://cloud.google.com/billing/docs/concepts)
4. [Google Cloud: Billing access control](https://cloud.google.com/billing/docs/how-to/billing-access)
