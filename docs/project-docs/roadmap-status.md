# Roadmap Status

Overall accepted progress is **62.5%**: five of the fixed eight phases have
passed their exit gates.

<!-- prettier-ignore -->
| Phase | Progress | Status | Milestone / exit condition |
| --- | ---: | --- | --- |
| 0. Architecture truth | 100% | Complete | Architecture and visual sources are preserved, decisions are reconciled, and project docs have no unresolved markers. |
| 1. Monorepo baseline | 100% | Complete | The pnpm workspace, five app shells, shared packages, dependency state, full validation, three-web-app Playwright smoke, and owner-reported five-app live smoke pass. |
| 2. Identity and security | 100% | Complete | Shared customer/staff flows, canonical guards, trusted provisioning/claims, cross-role/user/store/driver denials, replay/inactive denial, Rules, App Check decision, exact tagged cleanup, and current five-app manual identity/session evidence pass. |
| 3. Marketplace | 100% | Complete | Canonical marketplace source/deployment, live Firebase, web matrix, import/media/security boundaries, consistent Customer Web/App catalog, preview-APK physical checks, five-app manual acceptance, and redacted evidence pass. |
| 4. Maps, checkout, and payment | 100% | Complete | Source, deployment, three zero-residue runs, payment/repeat verification, signed webhook replay, provider/Admin configuration, Customer Web, composite Galaxy Note9 evidence, exact cleanup, documented limitations, and explicit owner acceptance pass. |
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

Phase 4 implements the shared cart, server-only Places/Routes quote,
versioned Mabopane fees, Admin controls, hosted Paystack initialization,
transactional verification/webhook reconciliation, exactly-once order
creation, Rules/indexes, tests, and owner-run harnesses. The complete local
source gate, deployment, one unpaid and two successful zero-residue backend
runs, hosted payment with repeat verification, provider/Admin configuration,
unchanged Phase 3 regression, and isolated Customer Web acceptance pass.
Galaxy Note9 captures show a partial end-to-end flow. A retained development
reference now has two successful signed webhook replays with one paid order and
one payment event, and the active store origin was corrected through the
trusted Function. A tagged corrected-origin quote returned 7,391 m and exact
cleanup returned zero. The later tagged Expo Go rerun resolved the catalog/cart
blocker by rendering `store to r`, adding `Kiddos Meal`, and displaying the
authoritative quote before exact cleanup. The remaining device checklist and
tagged native payment/cleanup were not completed as one same-run matrix. The
owner reviewed that limitation with the broader evidence on 2026-07-29 and
accepted the corrected 7,391 m exact-locality route plus the composite native,
backend, browser, provider, webhook, and cleanup record.

Phase 4 is therefore **100% accepted**, and overall accepted progress is
**62.5%**. Its production-hardening source now covers maximum-distance policy,
cleanup tooling, distributed Maps quota, staged App Check configuration,
Paystack rotation grace-period verification, and clean deployment/source
binding. The live rotation/deployment evidence and same-run native depth remain
manual; App Check provider enforcement is deferred to the end of Phase 7.
Phase 5 (Fulfillment) is the current milestone, and production remains blocked
until Phase 7.
