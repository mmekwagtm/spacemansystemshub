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
  ignored `.local-evidence/deployments/` directory. It uses Firebase CLI's
  file-based Functions manifest discovery with a bounded 60-second discovery
  window to avoid unreliable loopback discovery without changing the deployed
  scope.

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
isolation and again inside the final workspace test gate. On 2026-07-30, the
complete validation gate passed again after the file-based Firebase Functions
discovery and bounded timeout fix.

## Evidenced development deployment

- The approved wrapper deployed revision
  `df97a2161f7f70db0dbb0f3a56b1f63b15b98bc3` to development project
  `spacemansystemsbackend`.
- Scope was limited to `initializePaystackPayment`, `verifyPaystackPayment`,
  and `handlePaystackWebhook` in `africa-south1`.
- Firebase reported successful update operations for all three Functions.
- The generated record is
  `.local-evidence/deployments/2026-07-30T10-58-39.619Z-spacemansystemsbackend-df97a2161f7f.json`.
  It records `status: deployed`, exit code `0`, the exact project, scope,
  revision, timestamps, and a clean worktree before and after deployment.
- The record contains no `sk_test_` or `sk_live_` value. It remains ignored and
  was not committed or pushed.

App Check provider registration, measured rollout, rollback validation, and
enforcement are tracked only at the end of Phase 7.
