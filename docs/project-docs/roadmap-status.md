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
| 4. Maps, checkout, and payment | 50% | Source/local gate complete; acceptance pending | Server-verified serviceability/fee and Paystack verification create exactly one paid order per provider reference; Functions and live Mabopane suggestions pass, while live-payment, full browser, and complete device evidence remain. |
| 5. Fulfillment | 0% | Not started | The paid-to-delivered lifecycle passes across merchant, admin, driver, and customer with assignment/version safeguards. |
| 6. Operations | 0% | Not started | Failures are visible, auditable, notified, recoverable, and financially reconciled with retention and settlement evidence. |
| 7. Quality and launch | 0% | Not started | Production acceptance, observability, backups, runbooks, security review, final self-contained EAS preview-APK acceptance, Hosting/EAS releases, and rollback evidence pass. |

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
evidence all pass.

Phase 4 source now implements the shared cart, server-only Places/Routes quote,
versioned Mabopane fees, Admin controls, hosted Paystack initialization,
transactional verification/webhook reconciliation, exactly-once order
creation, Rules/indexes, tests, and owner-run harnesses. The complete local
source gate and non-mutating web foundation smoke pass. The nine development
Functions are active, and a corrected Places API (New) restriction/parser now
returns live Mabopane suggestions on the Galaxy Note9. Phase 4 remains **50%
in progress**, not accepted. Overall accepted progress remains **50%** until
the remaining provider, payment, cleanup, full Playwright, Galaxy Note9, and
evidence gates pass.
