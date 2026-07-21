# Current Status

## Accepted baseline

- Phase 0 (architecture truth) and Phase 1 (monorepo baseline) are complete.
- The canonical workspace contains three Vite/React web apps, two Expo Router
  native apps, shared `@spaceman/*` packages, and a separate Firebase Functions
  runtime.
- The original architecture blueprints and visual source documents remain
  preserved under `docs/architecture-docs/` and
  `docs/architecture-visuals-docs/`. Their functional, data, security, and
  operational boundaries are mapped into the project documentation and plans.
- The architecture fixes development at eight numbered phases, `0` through
  `7`. Phase 7 production acceptance is the only project-complete endpoint.
- Testing, review, commits, pushes, and deployments are manual. The owner
  reported that all five app shells start and render in the live smoke test.

## Dependency and cleanup state

- The root pnpm installation and lockfile are synchronized. Stale Expo 54 and
  Expo Router 6 virtual-store contexts from previous work were pruned; app-local
  `node_modules` symlink directories remain because pnpm requires them.
- Customer App and Driver App target Expo SDK 57, Expo Router 57, React Native
  0.86, and React 19.2. Both pass `expo install --check`.
- Both native manifests explicitly declare their runtime dependencies. Both
  Jest suites use the matching React Native preset, and both TypeScript
  configurations include Jest globals.
- `corepack pnpm dedupe --check` exits successfully without a lockfile change.
  It reports only Expo Router's optional Drawer peers (`react-native-reanimated`
  and `react-native-gesture-handler`) plus upstream transitive deprecations.
  Neither app imports Drawer APIs, so the unused native runtimes were not added.
- Generated Vite builds, Expo caches, prior Playwright results, and one
  accidental shell-output file were moved out of the repository rather than
  treated as source.
- Environment files, provider credentials, service accounts, generated output,
  and dependency directories remain ignored and uncommitted.

## Validation evidence

On 2026-07-21, the current checkout passed:

- `corepack pnpm validate`: documentation checks, recursive type-check, lint,
  unit tests, and builds for every eligible workspace project.
- Customer App and Driver App type-check, lint, Jest, build/type-check, and Expo
  SDK dependency compatibility checks.
- Playwright Chromium smoke tests for Admin Web, Merchant Web, and Customer Web.
  The first run exposed the default 30-second cold-navigation limit; the manual
  harness was serialized, given bounded cold-start timeouts, and configured to
  retain failure traces. The rerun passed all three tests.
- The project owner's manual five-app startup/render smoke test.

These results accept the application shells and development harnesses. They do
not accept the Phase 2-7 business flows.

## Implemented source foundations

- Shared contracts cover roles, user status, payment/refund, fulfillment,
  assignment versioning, needs-action projections, Zod inputs, typed errors,
  repositories, callable services, query keys, local state, maps,
  notifications, and shared auth guards.
- Firestore and Storage Rules, Firestore indexes, trusted Functions source,
  Hosting target templates, app-local environment examples, Playwright, and
  Maestro templates exist in source.
- Trusted source commands cover staff provisioning/status/scope, scoped
  store/catalog changes, merchant fulfillment transitions, driver assignment
  and foreground-only location updates, refund review, archive/redact,
  development fixture cleanup, and a transaction-based Paystack webhook.
- Checkout fails closed without a server-verified Maps quote; no source handler
  substitutes an unverified price.

## Not live or accepted

- Development Firebase collections, custom claims, App Check enforcement,
  Paystack test transactions, Maps quoting, FCM delivery, Hosting targets, and
  EAS development builds have not been accepted as end-to-end flows.
- Identity, catalog, quote, payment, fulfillment, notification, refund,
  archival, settlement, and production-operation acceptance remain in Phases
  2-7. Source scaffolding does not count as live evidence.
- No production deployment or production data migration is authorized.

## Next phase

Phase 2 is planned in `docs/plans-docs/PLAN-phase-2.md`. It begins with identity
contract reconciliation and ends only after trusted provisioning, claims,
cross-role denial, Rules, App Check decisions, tagged-fixture cleanup, and
cross-app development-project evidence all pass.
