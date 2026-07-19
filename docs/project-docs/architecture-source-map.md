# Architecture Source Map

The original architecture files are preserved under `docs/architecture-docs/`
and `docs/architecture-visuals-docs/`. This map identifies their operational
destination in the canonical workspace documentation.

| Source blueprint | Operational documentation |
| --- | --- |
| Five-App Ecosystem Master Plan | `architecture.md`, `data-model.md`, `workflow.md`, roadmap status. |
| Admin Web Blueprint | `architecture.md`, activities/audit rules, marketplace and release phases. |
| Customer App & Web Blueprint | Auth, checkout session, payment, Maps, tracking, and accessibility decisions. |
| Merchant Web Blueprint | Store scope, catalog, paid queue, fulfillment, and settlement decisions. |
| Driver App Blueprint | Assignment, foreground location, delivery, privacy, and Maestro coverage. |
| Admin PDF/PPTX sources | UI intent only; implementation decisions are normalized in the documents above. |

Where a source reference is intentionally undecided or conflicts with another
source, `architecture-decisions.md` records the chosen implementation contract.
