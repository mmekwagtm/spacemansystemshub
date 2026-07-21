# Roadmap Status

Overall progress is **25%**: two of the fixed eight phases are accepted.
Percentages count completed phase exit gates only; existing scaffolds do not
earn partial completion.

| Phase | Progress | Status | Milestone / exit condition |
| --- | ---: | --- | --- |
| 0. Architecture truth | 100% | Complete | Architecture and visual sources are preserved, decisions are reconciled, and project docs have no unresolved markers. |
| 1. Monorepo baseline | 100% | Complete | The pnpm workspace, five app shells, shared packages, dependency state, full validation, three-web-app Playwright smoke, and owner-reported five-app live smoke pass. |
| 2. Identity and security | 0% | Planned | Trusted provisioning/claims, active role and scope guards, cross-role denials, Rules evidence, App Check decisions, and tagged cleanup pass against development Firebase. |
| 3. Marketplace | 0% | Not started | Authenticated scoped catalog management and consistent active-catalog reads pass across admin, merchant, and customer channels. |
| 4. Maps, checkout, and payment | 0% | Not started | Server-verified serviceability/fee and Paystack verification create exactly one paid order per provider reference. |
| 5. Fulfillment | 0% | Not started | The paid-to-delivered lifecycle passes across merchant, admin, driver, and customer with assignment/version safeguards. |
| 6. Operations | 0% | Not started | Failures are visible, auditable, notified, recoverable, and financially reconciled with retention and settlement evidence. |
| 7. Quality and launch | 0% | Not started | Production acceptance, observability, backups, runbooks, security review, Hosting/EAS releases, and rollback evidence pass. |

## Fixed endpoint

The project has exactly eight phases, numbered `0` through `7`; no open-ended
phase is implied. Development is complete only when Phase 7 reaches 100% and
the production acceptance matrix is explicitly reviewed and passed. Passing a
smoke test, compiling a source scaffold, or deploying one environment cannot
move that endpoint.

## Current milestone

Phase 2 is the only active next milestone. Its strict scope and exit checklist
are defined in `docs/plans-docs/PLAN-phase-2.md`. Phase 3 must not begin until
every Phase 2 checklist item is complete.
