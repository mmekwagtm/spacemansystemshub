# Environment Setup

## Environment policy

All five applications and Cloud Functions use one shared, real Firebase
**development** project. Firebase emulators are not used. Production is a
separate, gated future environment and must not be configured or deployed from
the baseline without explicit approval.

## Required inputs before Firebase wiring

- Development Firebase project ID and client configuration for each supported
  platform.
- Firebase Authentication email/password enabled in the development project.
- Restricted development Maps credentials and billing/quota policy.
- Paystack test public/secret keys and webhook secret.
- FCM credentials/configuration for Customer and Driver apps.
- Expo EAS project IDs before native release configuration.

## Configuration rules

Track `.env.example` files only. Keep actual `.env.local` files untracked.
Client Firebase identifiers may be exposed only through the app configuration
layer; Paystack secrets, webhook secrets, service credentials, and private
keys stay in Firebase/CI secret stores. Never put secrets in source, docs,
browser bundles, or logs.

## Local source baseline

- Tracked app-local `.env.example` files exist for all five apps. Copy them to
  untracked local files only after a real development Firebase project is
  available.
- `apps/customer-app` and `apps/driver-app` target Expo SDK 57. Their manifests
  require the SDK-compatible Expo Router peer set to be resolved with pnpm
  before native development or testing.
- Do not treat the current ignored `node_modules` directory or lockfile as a
  portable SDK-57 baseline. After explicit authorization, synchronize the
  manifests, lockfile, and dependencies with pnpm before native validation.

## Development-test data

Integration fixtures in the shared development project must include a unique
`testRunId`. The dev-only cleanup command may remove only records marked with
that exact ID and must emit an audit entry.
