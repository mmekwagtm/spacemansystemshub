# Roadmap Status

Overall accepted progress is **37.5%**: three of the fixed eight phases have
passed their exit gates.

<!-- prettier-ignore -->
| Phase | Progress | Status | Milestone / exit condition |
| --- | ---: | --- | --- |
| 0. Architecture truth | 100% | Complete | Architecture and visual sources are preserved, decisions are reconciled, and project docs have no unresolved markers. |
| 1. Monorepo baseline | 100% | Complete | The pnpm workspace, five app shells, shared packages, dependency state, full validation, three-web-app Playwright smoke, and owner-reported five-app live smoke pass. |
| 2. Identity and security | 100% | Complete | Shared customer/staff flows, canonical guards, trusted provisioning/claims, cross-role/user/store/driver denials, replay/inactive denial, Rules, App Check decision, exact tagged cleanup, and current five-app manual identity/session evidence pass. |
| 3. Marketplace | 0% | Native/manual acceptance pending | Source, app interfaces, Rules/index/Functions deployment, prior Playwright evidence, and the live zero-residue matrix are complete. Both preview APKs now launch, but the corrected Playwright rerun and complete redacted five-app/manual evidence remain. |
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

Phase 2 is complete. Phase 3 (Marketplace) is in progress at **0% accepted**.
The bounded source implementation, runtime update, shared contracts,
repositories/queries, trusted Functions, Rules/indexes, import/media workflows,
four app interfaces, automated tests, development deployment, and Playwright
screenshots are complete in the reviewed Phase 3 implementation. External
JSON/HTTPS catalog API import and its cloud resources are removed; CSV
selected-row commit and Google Places staging remain. Cloud Run callable
transport IAM is owner-approved and applied. Post-removal live run
`phase3_marketplace_1784796233777_d40dfad0` passed all 11 current
marketplace/security cases against the redeployed narrowed bundle and verified
zero residue. A 2026-07-25 Galaxy Note9 rerun proves both preview APKs launch
and provides partial Customer/Driver workflow evidence. The corrected
Playwright live matrix and the remaining redacted five-app/manual acceptance
must still pass. Its approved contract is
`docs/plans-docs/PLAN-phase-3.md`; partial evidence does not increase accepted
progress or the overall 37.5% value before that gate passes.
