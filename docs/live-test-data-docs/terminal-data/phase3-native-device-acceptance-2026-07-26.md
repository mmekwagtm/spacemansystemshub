# Phase 3 final marketplace acceptance — 2026-07-26

This record supersedes the 2026-07-24 failed native launch and the 2026-07-25
partial native rerun for Phase 3 acceptance.

Device: Samsung Galaxy Note9 (`SM-N960F`), connected by USB with the serial
redacted. Environment: real development Firebase and self-contained internal
EAS preview APKs launched without Metro or Expo Go.

## Five-app acceptance

| Client | Accepted evidence | Result |
| --- | --- | --- |
| Admin Web | Manual media-backed publication, Google staging/approval, merchant review, CSV selected-row commit/replay, invalid-media rejection, availability, retirement, and parent suspension | Pass |
| Merchant Web | Draft submission, rejection/correction/resubmission, approved assigned-store editing, and cross-store denial | Pass |
| Customer Web | Guest/authenticated active-catalog parity, hidden inactive/retired records, unavailable state, pagination, cached refresh failure, and unrelated-catalog retention | Pass |
| Customer App | Guest/authenticated active-catalog parity, hidden inactive/retired records, unavailable state, pagination, session restoration, sign-out, cached offline fallback, and clean standalone launch | Pass |
| Driver App | Guest/sign-in boundary, active Driver scope, session restoration, sign-out, suspended-user denial, and no marketplace controls | Pass |

## Automated and live evidence

- Playwright run ID `phase3_accept_20260726_1450` completed as three bounded
  executions on the constrained workstation: Phase 3 matrix `2/2`, Phase 3
  continuation `2/2`, and web foundations `4/4`. The equivalent full suite is
  `8/8` passing.
- The continuation retired the controlled item, suspended its controlled
  parent store, confirmed both disappeared from Customer Web, and retained
  unrelated active catalog data.
- Records intentionally created by the accepted Playwright run remain in the
  development project at the owner's request.
- The exact temporary Driver denial fixture was removed from Authentication,
  its profile, and its associated audit data; verification found zero residue.
  No broad cleanup was performed.

## Final Customer preview build

- EAS build `6e06e1a9-985b-439f-abeb-d2489c0ac25e` finished successfully as
  Android internal preview version `0.1.0` (`versionCode` 1).
- The downloaded APK was installed over `com.customer.app` on the Note9.
- Online launch reached `Marketplace foundation`, reported
  `Catalog cached and current`, and rendered the same public active catalog
  records and item states already verified on Customer Web.
- With mobile data already disabled and Wi-Fi temporarily disabled, the app
  automatically reported `Cached catalog — offline`, displayed the safe
  cached-results alert, retained catalog data, and preserved that state after
  `Refresh catalog`.
- Wi-Fi was restored and verified enabled. A force-stop/relaunch returned the
  app to `Catalog cached and current`.
- The Android crash buffer was empty, and the clean launch log contained no
  prior public-Firebase configuration, Expo update recovery, or fatal-exception
  signature.

## Redacted screenshots

- `phase3-note9-customer-guest-catalog-2026-07-26.png`
- `phase3-note9-customer-offline-cache-2026-07-26.png`
- `phase3-note9-customer-pagination-2026-07-26.png`
- `phase3-note9-customer-catalog-parity-2026-07-26.png`
- `phase3-note9-driver-guest-boundary-2026-07-26.png`
- `phase3-note9-driver-suspended-denial-2026-07-26.png`
- `playwright-admin-retirement-evidence.png`
- `playwright-merchant-scoped-matrix.png`
- `playwright-customer-authenticated-catalog.png`
- `playwright-customer-final-visibility.png`
- `playwright-customer-error-feedback.png`

The evidence contains no email address, password, UID, access token, API key,
Firebase configuration value, or device serial.

## Acceptance result

Every Phase 3 exit item passes. Phase 3 is **100% accepted**, overall accepted
project progress is **50%**, and Phase 4 is unblocked but not started.
