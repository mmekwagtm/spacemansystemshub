# Roadmap Status

Overall accepted progress is **50%**: four of the fixed eight phases have
passed their exit gates.

<!-- prettier-ignore -->
| Phase | Progress | Status | Milestone / exit condition |
| --- | ---: | --- | --- |
| 0. Architecture truth | 100% | Complete | Architecture and visual sources are preserved, decisions are reconciled, and project docs have no unresolved markers. |
| 1. Monorepo baseline | 100% | Complete | The pnpm workspace, five app shells, shared packages, dependency state, full validation, three-web-app Playwright smoke, and owner-reported five-app live smoke pass. |
| 2. Identity and security | 100% | Complete | Shared customer/staff flows, canonical guards, trusted provisioning/claims, cross-role/user/store/driver denials, replay/inactive denial, Rules, App Check decision, exact tagged cleanup, and current five-app manual identity/session evidence pass. |
| 3. Marketplace | 100% | Complete | Canonical marketplace source/deployment, live Firebase, web matrix, import/media/security boundaries, consistent Customer Web/App catalog, preview-APK physical checks, five-app manual acceptance, and redacted evidence pass. |
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

Phase 3 (Marketplace) is complete at **100% accepted**. Its bounded source,
runtime update, shared contracts, repositories/queries, trusted Functions,
Rules/indexes, CSV and Google staging, media workflows, four marketplace app
interfaces, automated tests, development deployment, live zero-residue
matrix, and security boundaries pass. External JSON/HTTPS catalog API import
and its cloud resources remain removed.

Final 2026-07-26 evidence records Playwright run
`phase3_accept_20260726_1450` passing all eight bounded web scenarios and a
Galaxy Note9 passing self-contained Customer/Driver preview-APK acceptance.
Customer Web/App active-catalog parity, offline fallback, pagination,
session/sign-out, inactive-data hiding, Driver regression, and redacted
evidence all pass. Phase 4 (Maps, checkout, and payment) is unblocked but not
started. Rotate the exposed Paystack test secret before Phase 4 payment work.
