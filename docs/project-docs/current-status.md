# Current Status

## Source scaffold implemented

- Architecture source material is preserved and fully mapped into operational
  project documentation.
- The repository has a fresh local Git history on `main`.
- Governance decisions, the canonical root data model, and the phased roadmap
  are documented.
- A pnpm workspace declares three Vite/React web apps, two Expo Router native
  apps, all required `@spaceman/*` shared packages, and a separate Functions
  runtime.
- Shared source contracts cover roles, user status, payment/refund,
  fulfillment, assignment versioning, needs-action projections, Zod inputs,
  typed errors, repositories, callable services, query keys, local state,
  maps, notifications, and shared auth guards.
- Firestore/Storage Rules, Firestore indexes, trusted Functions source,
  Hosting target templates, app-local environment examples, GitHub Actions,
  Playwright baseline, and Maestro templates exist in source.
- Trusted source commands cover staff provisioning/status/scope, scoped
  store/catalog changes, merchant fulfillment transitions, driver assignment
  and foreground-only location updates, refund review, archive/redact,
  development fixture cleanup, and a transaction-based Paystack webhook.
  Checkout fails closed without a server-verified Maps quote; no source
  handler substitutes an unverified price.

## Intentionally not configured or deployed

- Development Firebase project configuration, Paystack secrets, Maps
  credentials, FCM configuration, and EAS project identifiers.
- Live Firebase collections, custom claims, App Check, webhook endpoint,
  Hosting targets, EAS builds, or CI environment secrets.
- End-to-end identity, catalog, quote, payment initialization, notifications,
  refund, archival, settlement, and production operations. The source
  contracts and selected trusted-command foundations do not make those flows
  live or accepted.
- Any production deployment or production data migration.

## Package and validation state

- Native manifests target Expo SDK 57, Expo Router 57, React Native 0.86, and
  React 19.2.
- A prior dependency installation was intentionally not synchronized after the
  SDK target was restored to 57. Do not rely on the current ignored
  `node_modules` directory or `pnpm-lock.yaml` as a validation baseline.
- Run one pnpm install only after it is authorized, then resolve the native
  Expo Router peer set with that same SDK 57 installation before running
  workspace checks.

## Validation status

- Documentation marker scanning passed.
- Targeted non-native typecheck and lint passed for every shared package,
  Functions, and the three Vite apps.
- Eligible unit suites passed for core, validation, trusted policies,
  Functions, and the three Vite apps. The Functions bundle and all three Vite
  apps also built successfully.
- Trusted-policy tests cover merchant ownership denial, fulfillment transition
  permission, assignment-version conflicts, signed-payment replay decisions,
  foreground tracking stop conditions, refund bounds, and self-archive denial.
  These are source-level tests, not development Firebase integration evidence.
- Full workspace/native typecheck, lint, Jest, build, Playwright, Maestro,
  Rules deployment, and development Firebase integration checks remain
  unrun against the current SDK-57 manifest state. Run the commands in
  [live-test-steps.md](live-test-steps.md) only after the dependency state is
  synchronized.
