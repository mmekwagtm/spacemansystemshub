# Phase 4 Maps, Checkout, and Payment Evidence

## Current decision

Phase 4 source and local validation are complete but Phase 4 is **not
accepted**. Overall accepted project progress remains **50%**. The development
Functions and live Mabopane suggestions are now verified; Paystack
transactions, provider webhook evidence, isolated Phase 4 Playwright, the
complete live matrix, and full Galaxy Note9 checkout acceptance remain.

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

Final local checks completed on 2026-07-26:

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
- Non-mutating Playwright web foundations passed 4/4. The credentialed Phase 3
  live regression and isolated Phase 4 payment run remain owner gates.

## Live Maps and Note9 evidence — 2026-07-28

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
  Places tokens of at most 36 characters. Targeted validation passed. The
  complete matrix rerun was unavailable in this run, so no full matrix pass is
  claimed.

## Outstanding owner evidence

- Read-only Paystack inspection plus current Rules/index and exact Cloud Run
  transport-binding confirmation.
- Paystack test webhook configuration and signed delivery.
- One successful and one failed/abandoned hosted test payment.
- Verification replay and webhook replay producing exactly one order.
- Self-cleaning live Maps/security/payment matrix with zero tagged residue.
- Isolated Phase 4 Customer Web Playwright screenshots.
- Customer Web manual review and Galaxy Note9 Customer App Expo Go acceptance.
- Redacted evidence review and explicit owner acceptance.

Until these items pass, do not mark Phase 4 complete and do not disable the
previous Paystack secret version needed for rollback.

## Galaxy Note9 Expo Go history

- The connected Samsung Galaxy Note9 (`SM-N960F`) was detected over USB and
  Expo Go was installed.
- Customer App started from the current local bundle in Expo Go and rendered
  the Phase 4 cart/checkout interface without a native crash.
- The delivery-address field and required `Powered by Google` attribution were
  visible.
- The initial 2026-07-27 checkout flow did not pass because address
  suggestions did not resolve. The 2026-07-28 fix and successful suggestion
  evidence above supersede that address-search failure.
- No payment was initialized and no order, payment, or cleanup success can be
  inferred from this check.
- A self-contained EAS preview build was attempted, but it is no longer a Phase
  4 requirement. Preview-APK acceptance is deferred to the final Phase 7 gate.
- Expo Go is the Phase 4 physical-device acceptance path. Full quote, hosted
  payment, resume/recheck, and exactly-one-order evidence remains pending.
- Driver App was separately bundled from current source on a distinct Metro
  port and rendered its invitation-only sign-in screen in Expo Go. No
  `FATAL EXCEPTION`, `AppError`, or missing-public-Firebase crash marker was
  present. This is a regression smoke only; Driver has no Phase 4 checkout
  acceptance responsibility.

The successful Mabopane-suggestion screenshot is retained without credentials
or payment data. Phase 4 remains **50% in progress**, and overall accepted
progress remains **50%**.
