# Environment Setup

## Environment policy

All five applications and Cloud Functions use one shared, real Firebase
**development** project. Firebase emulators are not used. Production is a
separate, gated future environment and must not be configured or deployed
without explicit approval.

## Current development Firebase state

- Project `spacemansystemsbackend` has email/password Authentication, a
  Standard Firestore database, the default Firebase Storage bucket, and the six
  Phase 2 identity Functions in `africa-south1`.
- All five ignored `.env.local` files select that project and region.
- Customer App and Driver App have app-specific Android packages and local,
  ignored `google-services.json` files downloaded from their registered
  Firebase Android applications.
- Firestore and Storage Rules are deployed. Storage remains deny-all until a
  later feature phase defines an owned upload contract.
- Maps restrictions/quotas, FCM delivery, EAS project IDs, and production
  environment configuration remain later-phase work.
- The Paystack test secret must be rotated before Phase 4 because its original
  value appeared in diagnostic command output during setup. Never reuse or
  document that value.

## Configuration rules

Track `.env.example` files only. Keep actual `.env.local` files untracked.
Client Firebase identifiers may be exposed only through the app configuration
layer; Paystack secrets, webhook secrets, service credentials, and private keys
stay in Firebase-managed secret storage. Never put secrets in source, docs,
browser bundles, or logs.

`apps/customer-app/google-services.json` and
`apps/driver-app/google-services.json` are required local inputs but are
ignored and must not be staged. Their Firebase application IDs and Android
package names must match the corresponding `app.json`; one app must not borrow
the other app's package registration.

## Local source baseline

- Tracked app-local `.env.example` files exist for all five apps; actual values
  are present only in ignored `.env.local` files.
- Customer App and Driver App target Expo SDK 57 and use the checked-in pnpm
  lockfile. `expo install --check`, Jest, TypeScript, and Android production
  export passed on 2026-07-21.
- Install dependencies only with `corepack pnpm install --frozen-lockfile`.

## Development-test data

Integration fixtures in the shared development project must include a unique
`testRunId`. Cleanup may remove only records and Auth UIDs created by that
exact run.

The Phase 2 live identity script creates random temporary Auth users and exact
tagged documents, deletes only their UIDs and tag, and fails if either Auth or
Firestore residue remains.
