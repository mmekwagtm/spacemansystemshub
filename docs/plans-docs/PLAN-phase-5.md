# Phase 5 Plan: Fulfillment and Production-Hardening Gate

## Status

Phase 5 fulfillment remains pending. The production-hardening prerequisites
carried forward from the accepted Phase 4 checkout review are implemented at
source level and await the manual cloud actions in
`docs/project-docs/phase-5-evidence.md`.

## Production-hardening checklist

- [x] Invalidate stale quotes when price or serviceability metadata changes.
- [x] Bind each Places selection to its owning session token and dispose of the
  token after quote use.
- [x] Recover from blocked or failed hosted-payment launch without persisting a
  false pending state.
- [x] Use one reconciliation decision contract for callable and webhook paths.
- [x] Reconcile through deterministic documents in one Firestore transaction,
  with consumed-session replay preventing duplicate orders.
- [x] Cover paid, failed, cancelled, abandoned, processing/delayed, and replayed
  outcomes with behavioral tests.
- [x] Make fixture cleanup failures visible and verify every supported tagged
  collection.
- [x] Isolate Playwright evidence by `testRunId` and provide exact Expo Go
  cleanup.
- [x] Preserve unlimited legacy delivery zones while supporting a versioned,
  server-enforced maximum distance.
- [x] Enforce Maps quotas transactionally across Function instances.
- [x] Make App Check enforcement explicit and staged.
- [x] Provide non-disclosing Paystack rotation/grace-period verification.
- [x] Bind Firebase deployment evidence to a clean Git revision and explicit
  Firebase project.
- [ ] Deploy through the evidenced wrapper and retain its generated record.

The unchecked item requires an approved external Firebase action.
App Check provider registration and enforcement is deferred to the final Phase
7 acceptance gate. None of these actions change the accepted Phase 4 status or
start Phase 5 fulfillment acceptance.
