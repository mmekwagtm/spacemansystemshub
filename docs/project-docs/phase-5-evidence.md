# Phase 5 Production-Hardening Evidence

## Scope and decision

This record covers only the production-hardening work carried from the Phase 4
post-acceptance recommendations. It does not claim that Phase 5 fulfillment,
production deployment, App Check provider rollout, or Paystack secret rotation
has been accepted.

## Implemented evidence

- Checkout quote identity now includes normalized delivery metadata, and a
  selected Places candidate retains the exact token that produced it.
- Web and Expo Go payment launch persists pending state only after the hosted
  checkout opens. Initialization or launch failures remain retryable.
- `planPaystackReconciliation` is the authoritative payment outcome decision.
  The runtime verifies provider reference, amount, and currency before applying
  deterministic event and order writes inside one Firestore transaction.
  Consumed-session replay returns the existing order.
- Behavioral tests cover paid, failed, cancelled, abandoned, delayed,
  duplicate, AppState, account ownership, Linking failure, `testRunId`, popup
  blocking, and autocomplete cancellation behavior.
- Fixture cleanup uses `firebase/functions/fixture-collections.json` as its
  shared coverage manifest, fails on callable errors, and reports missing or
  unsupported collections. Expo Go cleanup requires one exact run identifier.
- Playwright evidence is written below the ignored
  `.local-evidence/phase4-playwright/<testRunId>/` directory.
- Delivery zones accept an optional `maximumDeliveryDistanceMetres`. Omission
  preserves the existing unlimited behavior; changing it increments
  `serviceAreaVersion`. New quote and order route snapshots retain the exact
  zone and service-area version, and the trusted quote transaction rejects
  routes beyond the snapshotted boundary.
- Maps request limits use Firestore transactions keyed by flow and hashed actor
  identity, so Function instances share one quota boundary.
- `SPACEMAN_ENFORCE_APP_CHECK` accepts only `true` or `false` and defaults to
  disabled for current development and Expo Go compatibility.
- `verify:paystack:rotation` verifies the current Secret Manager version before
  rotation and optionally verifies the replacement version during Paystack's
  temporary expiry grace period. It reports only version state, provider domain,
  verification result, and transaction status; secret values are never printed.
- `deploy:firebase:evidenced` requires a clean Git tree plus explicit project
  and scope, then stores the exact revision and deployment result under the
  ignored `.local-evidence/deployments/` directory.

## Validation record

Targeted validation passed for shared payment logic, delivery validation, Maps
guards, Customer Web checkout, Customer App behavior, Admin checkout settings,
Firebase Functions, cleanup scripts, and the new package-level service/query/
Firebase tests. From the repository root,
`corepack pnpm validate` passed documentation checks, architecture boundaries,
all workspace typechecks, lint, tests, and builds on 2026-07-29. The final
review rerun passed the same complete gate after the authoritative
reconciliation, service-area snapshot, cleanup failure handling, and
behavioral-test gaps were closed. An earlier resource-heavy parallel diagnostic
timed out in Customer Web; its corrected checkout suite passed 11/11 in
isolation and again inside the final workspace test gate.

## Manual external actions

1. Keep version `3` as the only enabled Paystack Secret Manager version and do
   not reactivate retired version `2`. During an approved rotation window,
   [generate a replacement Paystack key and choose when the old key expires](https://support.paystack.com/en/articles/2123458).
   Add the replacement as a new Secret Manager version, then run
   `corepack pnpm verify:paystack:rotation` with the current version, replacement
   version, environment, and approved reference identifiers. Verify both during
   the provider-controlled overlap, deploy the replacement through an approved
   exact scope, and confirm old-key expiry before disabling its Secret Manager
   version. Do not keep a second enabled version solely for permanent rollback.
2. The Firebase deployment scope is not yet documented. Do not run
   `corepack pnpm deploy:firebase:evidenced` until the exact scope is reviewed
   and separately approved. The wrapper must bind that scope and the development
   project to a clean committed revision.

App Check provider registration, measured rollout, rollback validation, and
enforcement are tracked only at the end of Phase 7.
