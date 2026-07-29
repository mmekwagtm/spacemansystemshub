# Phase 4 Maps, Checkout, and Payment Evidence

## Current decision

Phase 4 is **100% accepted** as of 2026-07-29. Overall accepted project
progress is **62.5%**: five of the fixed eight phases have passed their exit
gates. Acceptance is based on the combined source, deployment, provider/Admin,
backend, Customer Web, Galaxy Note9 Expo Go, hosted-payment, webhook-replay,
and exact-cleanup evidence below. Phase 5 (Fulfillment) is the next phase.

## Implemented source

- Versioned one-store cart persistence through localStorage on Customer Web
  and AsyncStorage on Customer App, with explicit cross-store replacement and
  unavailable-item rejection.
- Server-only ZA address autocomplete/details and Routes distance/duration.
- Versioned delivery zones and fee rules with approved Mabopane pricing,
  upward fractional-cent rounding, and R20–R80 clamping.
- Fail-closed Admin enable controls and staff-only configuration reads.
- Ten-minute idempotent checkout sessions with immutable catalog, store,
  address, route, and fee snapshots.
- Hosted Paystack initialization, shared verification/webhook reconciliation,
  deterministic references, exact amount/currency checks, and a
  side-effect-free return page.
- Exactly-once paid-order creation with payment/order/audit/notification/outbox
  evidence; unpaid states never create an order.
- Extended Rules, required customer-order/fee-rule indexes, and privileged
  exact tagged cleanup that verifies zero residue before returning success.
- Isolated owner-run development matrix and Phase 4 Playwright harness.

## Local evidence

Focused checks completed during implementation:

- Shared validation, Maps, cart state, and trusted-domain tests: passed.
- Firebase Functions type-check, lint, unit tests, and helper tests: passed.
- Admin Web, Customer Web, and Customer App type-check/lint: passed.
- Admin configuration tests: passed.
- Customer Web cart/address/quote/expiry/hosted-payment/focus/offline tests:
  passed.
- Customer App checkout contract tests: passed.

Historical local checks completed on 2026-07-26:

- `git diff --check` passed.
- Root documentation passed for 21 governance/project/plan documents.
- Root type-check and lint passed across all 21 participating workspace
  projects.
- Root tests passed: 76 tests across shared packages, Functions, all five app
  shells, and web interfaces.
- Root build passed, including the 289.95 KB deployable Functions bundle and
  all three Vite production bundles.
- Expo dependency compatibility passed for both native apps.
- Expo Doctor passed 20/20 checks for Customer App and Driver App. One stale,
  undeclared Driver `node_modules/eas-cli` link was removed before the
  successful rerun; no manifest dependency changed.
- Fresh local Android exports passed: Customer 4.4 MB Hermes bundle and Driver
  4.2 MB Hermes bundle under ignored `.local-evidence/`.
- Non-mutating Playwright web foundations passed 4/4. Later credentialed
  regression and payment evidence is recorded below.

Current source checks completed on 2026-07-29:

- Documentation, workspace type-check, lint, tests, all builds, both Expo
  dependency checks, and both Expo Doctor checks passed.
- The deployable Functions bundle was 297.58 KB.
- The reviewed base source revision is
  `128c58ea5d8f8f3c74b8e34f74d67f5e2a6b1fa0`. The present Customer App
  acceptance harness also includes a seven-line, uncommitted working-tree
  delta across `apps/customer-app/.env.example`,
  `apps/customer-app/app/index.tsx`, and
  `apps/customer-app/src/CheckoutPanel.tsx` for the optional development-only
  `testRunId`. Current Phase 4 source/harness is therefore not clean against
  that revision.
- The deployment transcript did not record the deployed revision, so the
  evidence is not a cryptographic deployment-to-commit binding.
- A fresh current-source Customer Android export passed after the
  `testRunId` wiring; its bundle and metadata are retained under ignored
  `.local-evidence/phase4-customer-export/`.
- Customer App passes an optional development-only
  `EXPO_PUBLIC_PHASE4_TEST_RUN_ID` through checkout creation. The Note9 quote
  rerun exercised that tag and exact cleanup; a future native payment can use
  the same scoped cleanup mechanism.

## Development live evidence — 2026-07-28

- The incorrect identity-service message had two backend causes:
  `places.googleapis.com` was absent from the server-key restriction, and one
  valid prediction omitted optional secondary text.
- The existing server key now allows only the Places backend, Places API
  (New), and Routes services. Secret Manager version 3 still resolves to that
  restricted key; no key value was recorded.
- `searchDeliveryAddresses` was redeployed alone and a direct authenticated
  call returned five suggestions.
- Galaxy Note9 Expo Go then displayed five live Mabopane suggestions with
  Google attribution and accepted a selected result. Evidence:
  `docs/live-test-data-docs/images/phase4-images/customer-app-mabopane-address-suggestions-expo-go.png`
  and
  `docs/live-test-data-docs/images/phase4-images/customer-app-mabopane-address-selected-expo-go.png`.
- The live matrix passed isolated identities, versioned configuration, the
  eligible catalog fixture, three-character rejection, and exact zero-residue
  cleanup before an overlong Google session token caused HTTP 400.
- Web, native, shared validation, and the matrix script now generate or enforce
  Places tokens of at most 36 characters. Targeted validation passed.
- Development Firestore Rules and indexes deployed successfully. All nine
  Phase 4 Functions updated successfully, and the terminal record returned
  `roles/run.invoker` for each of the nine services.
- The terminal record confirms that the three Maps APIs are enabled and that
  the named server-key resource allows only the Places backend, Places API
  (New), and Routes. It does not independently compare the Secret Manager key
  value with that resource.
- Admin captures show an active Mabopane zone, active fee-rule version 1 with
  the approved values, and all three checkout enable flags saved.
- A Paystack test-dashboard capture shows the callback and webhook fields
  configured. It exposes a provider account identifier and remains retained
  for owner review under the evidence instruction.
- Paystack secret version `3` was confirmed as test mode without printing the
  value and reconciled a successful hosted test payment.
- Backend run `phase4_checkout_1785263019703_447d3a33` passed the Maps,
  security, quote, hosted-URL, and unpaid/no-order cases, then verified exact
  Auth and Firestore cleanup.
- Backend run `phase4_checkout_1785263181986_e559bf05` passed a successful
  hosted payment and repeated verification with exactly one paid order, then
  verified exact Auth and Firestore cleanup.
- A later successful run `phase4_checkout_1785274758928_78d1be8d` repeated
  the same exactly-once payment and verification checks, then verified exact
  Auth and Firestore cleanup.
- The unchanged Phase 3 Playwright regression passed 8/8.
- Isolated Customer Web run
  `phase4_playwright_1785267576141_fde0c50e` passed 1/1, including its
  mandatory tagged-fixture cleanup hook.
- Raw Galaxy Note9 captures show address selection, an authoritative quote,
  hosted-browser launch, Paystack test success, the safe return page, app-side
  reconciliation to a paid order, and an abandoned/no-order state. They do not
  complete the full physical-device checklist. Owner-provided captures remain
  under `docs/live-test-data-docs/images/phase4-images/`, including captures
  with account, address, order, local-network, merchant, or provider fields;
  those fields are called out for owner review and are not discarded.
- Time-correlated `INFO` requests to `handlePaystackWebhook` support that the
  provider reached the handler during successful payments. A signed replay of
  retained development reference `spc_checkout-d405ae2dc61a92bd` returned
  HTTP 200 with `reconciled:true,status:paid` twice; Firestore still contains
  exactly one paid order and one payment event for that reference. The retained
  record has no `testRunId`, so it is replay evidence but not cleanup evidence.
- The active development store `EYtuRg8911hAZYbnb0am` had longitude `26.1007`.
  The trusted `upsertStore` Function corrected it to `28.1007`, matching the
  Mabopane origin used by the other live fixture.
- A fresh Expo Go rerun on the Galaxy Note9 cleared the persisted cart, rendered
  `store to r`, found and added `Kiddos Meal` at R50, completed owner sign-in,
  selected the first validated Mabopane address, and displayed the server quote
  (R47.57 delivery, 7.4 km/about 14 min, R97.57 total). Exact cleanup for
  `phase4_note9_20260729_0002` deleted one tagged checkout session and returned
  zero remaining. No payment was submitted in this rerun.

## Image audit — 40 captures and one CSV artifact

The captures visibly support:

- Guest-cart intent and the protected checkout boundary.
- Mabopane Places suggestions, selection, and Google attribution.
- Quote totals and expiry timestamps, hosted-browser launch, Paystack test
  success, the side-effect-free return page, a visible paid order, and a
  separate abandoned/no-order UI state.
- Active Admin zone/fee configuration and all three enable flags.

The mobile quote, provider payment, and visible order are internally
consistent at R265. The Customer Web quote is R130 while the desktop provider
capture is R147.57; they are separate runs and must not be presented as one
end-to-end sequence.

The image set alone does not prove persisted cross-store replacement,
unavailable items, expired-quote rejection, offline blocking, whether app
resume or the manual **Check payment** action reconciled the payment, or clean
crash logs. The current Android export and targeted crash/error query are
recorded in terminal evidence, not established by the images themselves.

Raw captures containing a full/partial address, account email, order/reference
identifier, provider account identifier, local IP/path, or test-card fields
remain in the evidence set because they are owner-provided acceptance evidence;
the exposed fields are recorded for review. The two desktop return captures are
duplicates. A long native capture also shows historical Phase 3-named
Playwright stores in the live catalog; those records are not tied to the
current Phase 4 run IDs, so they do not invalidate exact Phase 4 cleanup but
require separate data-ownership review. Other captures show a generic service
error persisting after cart/account state changes.

## Acceptance basis and retained limitations

- The owner accepted the evidence as one combined record, not as a claim that
  every outcome occurred in one tagged native run. Raw native captures support
  successful and abandoned payment/order behavior; the tagged Expo Go rerun
  supports the current quote path and exact checkout cleanup; tagged backend
  runs support successful payment and exact Auth/Firestore cleanup.
- The corrected-origin quote of 7,391 m / 791 s with a R47.57 delivery fee and
  R97.57 total is accepted for the current exact-locality Phase 4 route policy.
  A maximum-distance boundary is a post-acceptance improvement, not a completed
  control.
- Persisted cross-store replacement, unavailable-item handling, quote expiry,
  offline blocking, and resume-versus-manual-check reconciliation were not all
  recaptured in one tagged Galaxy Note9 payment run. This is retained as a
  test-depth risk; it is not represented as completed same-run evidence.
- The retained paid webhook-replay reference has no `testRunId` and is not
  counted as tagged cleanup evidence.
- Paystack secret version `2` was disabled before signed-webhook replay was
  retained. Development acceptance records that rollback-readiness limitation;
  secret recovery and rotation evidence remains a Phase 7 production-readiness
  concern requiring separately approved backend action.
- The current terminal record is
  `docs/live-test-data-docs/terminal-data/terminal-data-phase-4.md`. Temporary
  hosted Paystack URLs, the API-key resource identifier, and verbose cloud audit
  identifiers were removed from that record.

## Post-acceptance improvement report

This is an analysis record only. No source code, tests, or configuration were
changed while producing it.

### Source changes recommended

1. In `apps/customer-web/src/CheckoutPanel.tsx` and
   `apps/customer-app/src/CheckoutPanel.tsx`, invalidate or lock the quote when
   the normalized delivery label or instructions change. The backend request
   hash in `firebase/functions/src/phase4.ts` includes those fields, but both
   clients currently invalidate mainly for cart lines and selected place ID;
   payment can therefore remain enabled for an older server snapshot.
2. In both checkout panels, bind a Google Places session token to the selected
   candidate or require a new search before re-quoting. The token rotates after
   quote creation while the selected place remains, so a repeated quote can
   submit a token that did not own the Autocomplete selection.
3. In Customer Web, clear or defer persisted pending-checkout state when both
   hosted-payment popup attempts are blocked. The current order can be left in
   a misleading pending UI state even though no hosted checkout opened.
4. In `firebase/functions/src/phase4.ts`, extract or inject the shared
   reconciliation decision path and use the already-tested pure decision
   contract from `packages/app-functions`, or remove the unused duplicate.
   Runtime and tested decision logic should not drift.
5. Add a versioned maximum delivery distance to the delivery-zone contract,
   schema, trusted quote path, Admin control, and docs if product policy requires
   distance-based rejection. The current fee cap limits price, not
   serviceability.

### Test and tooling changes recommended

1. Replace or supplement
   `apps/customer-app/src/app-contract.test.ts` source-string assertions with
   React Native behavior tests for AppState resume, manual check, Linking
   failure, offline/expiry, paid/processing/failed/abandoned states, account
   mismatch, and `testRunId` propagation.
2. Add deterministic transaction-level tests around initialization,
   reconciliation, webhook replay, mismatch, processing, abandoned, failed, and
   concurrent delivery in `firebase/functions/src/phase4.ts`.
3. Extend `tests/web-e2e/phase4-live-checkout.spec.ts` beyond opening and closing
   the Paystack popup. Cover paid, processing, failed, abandoned, manual-check,
   visible-order, no-order, and popup-blocked behavior with bounded provider
   seams.
4. Add real test scripts for `packages/app-services`, `packages/app-query`, and
   `packages/app-firebase`. Root `--if-present` currently skips those packages
   silently.
5. Make `firebase/functions/scripts/live-checkout.mjs` fail when the privileged
   cleanup callable fails instead of silently substituting direct Admin
   deletion. Verify every tagged collection, including assignments, locations,
   activities, import batches, and settlements.
6. Add a standalone owner cleanup helper that calls `cleanupTestFixtures` for
   the exact Expo Go `testRunId` and verifies zero residue. Section 19 currently
   describes the call but supplies no executable helper.
7. Write generated Playwright screenshots to an ignored, run-specific evidence
   directory. Fixed tracked paths overwrite reviewed images and dirty the
   worktree.
8. Add fake-timer/cancellation coverage for the documented autocomplete
   debounce. The live script checks minimum length and a successful search but
   does not prove debounce cancellation.

### Configuration changes recommended

1. Before production, replace process-local Maps request budgets with a
   distributed quota boundary and stage App Check enforcement with measured
   rollback. Multiple Function instances can each consume the current local
   allowance.
2. If maximum service distance is approved, publish it as a versioned
   delivery-zone/fee-policy value rather than a client constant, and fail quote
   creation closed beyond that boundary.
3. Before Phase 7 production acceptance, prove a current Paystack secret
   rollback/rotation path without reactivating version `2`, and bind deployment
   evidence to an exact clean source revision.

## Owner acceptance — 2026-07-29

The owner reviewed the Phase 4 source and working-tree traceability, deployment
records, Maps and Paystack configuration, successful and abandoned payment
evidence, webhook replay, Customer Web acceptance, Galaxy Note9 Expo Go
acceptance, exact zero-residue cleanup, and the retained limitations above.

The evidence set intentionally retains owner-provided captures containing
account, address, order, payment, local-network, merchant, or provider fields
where they are relevant. Their presence is disclosed; the evidence is not
described as fully redacted.

Phase 4 is explicitly **100% accepted**. Overall accepted project progress is
**62.5%**. Production remains blocked until Phase 7 acceptance.
