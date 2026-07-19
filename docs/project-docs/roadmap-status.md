# Roadmap Status

| Phase | Status | Exit condition |
| --- | --- | --- |
| 0. Architecture truth | Complete | Governance/project docs have no unresolved markers and source references are mapped. |
| 1. Workspace baseline | In progress | Workspace, five shells, shared packages, local Git, config, and harnesses exist; dependency synchronization and checks remain. |
| 2. Identity and security | Scaffolded | Role/status contracts, auth guards, Rules, and trusted-command boundaries exist; live email/password, claims, and rules tests remain. |
| 3. Marketplace | Scaffolded | Scoped store/catalog commands and data contracts exist; authenticated catalog UI, imports, and live active-catalog queries remain. |
| 4. Maps, quotes, payment | Scaffolded | Checkout fails closed without a verified quote and webhook idempotency source exists; Maps quoting, Paystack initialization, secrets, and provider verification remain. |
| 5. Fulfillment | Scaffolded | Merchant transition, driver assignment, and foreground location source commands exist; cross-app live lifecycle acceptance remains. |
| 6. Operations | Scaffolded | Notification/refund/archive contracts and audited source commands exist; delivery, reconciliation, settlement, retention, and live operation remain. |
| 7. Release readiness | Scaffolded | CI approval workflows and Hosting/EAS templates exist; connected environments, observability, runbooks, and acceptance remain. |

Scaffolded means source-level contracts/templates exist, not that a backend,
deployment, or acceptance path is live. Progress changes only after matching
source, tests, and validation evidence exist in this workspace.
