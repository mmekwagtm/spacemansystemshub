# Current Status

## Accepted baseline

- Phase 0 (architecture truth), Phase 1 (monorepo baseline), and Phase 2
  (identity and security) are complete.
- The canonical workspace contains three Vite/React web apps, two Expo Router
  native apps, shared `@spaceman/*` packages, and a separate Firebase Functions
  runtime.
- The original architecture and visual source documents remain preserved.
- The architecture has exactly eight phases, `0` through `7`; Phase 7
  production acceptance is the only project-complete endpoint.
- Testing, review, commits, pushes, and production deployment remain manual.

## Phase 2 accepted state

Phase 2 source, development-cloud, automated, live-security, and manual
five-client identity acceptance are complete.

- All five apps use app configuration, Firebase gateway, service, and shared
  auth layers. Screens do not import Firebase or another app directly.
- Customer Web and Customer App implement guest, registration, verification,
  sign-in, claims refresh, protected-boundary, session restoration, and
  sign-out states.
- Admin Web, Merchant Web, and Driver App implement invitation/password setup,
  role/status/scope guards, session restoration, refresh, and sign-out.
- Firestore, the default Storage bucket, Firestore/Storage Rules, and six
  identity callable Functions are live in the `spacemansystemsbackend`
  development project and `africa-south1`.
- The canonical profile is checked by both Rules and Functions, so suspended
  and archived stale tokens fail immediately. User-status transitions reject
  replay and make `archived` terminal.
- App Check enforcement is intentionally deferred per `app-check.md` to avoid
  locking out web localhost and Expo Go clients before providers and
  development builds are ready.

## Phase 3 implementation state

Phase 3 (Marketplace) source implementation is complete against the bounded
contract in `docs/plans-docs/PLAN-phase-3.md`; accepted progress remains 0%
until the owner-operated five-app/manual matrix passes. The development live
matrix already passes with exact cleanup.

- Shared types, validation, repositories, services, TanStack Query hooks,
  Firestore/Storage Rules, indexes, trusted Functions, and app-owned interfaces
  implement one marketplace contract.
- Admin supports manual store/item work, merchant review, Google staging,
  CSV preview and selected commit, media, and retirement. Merchant supports
  pending onboarding and assigned-store/catalog changes. External JSON/HTTPS
  catalog API import is prohibited and removed.
- Customer Web and Customer App use the same guest-readable active catalog,
  categories, unavailable-item state, thumbnails, bounded pagination, and
  stale/error feedback. Driver App remains a regression-only client.
- Imports are staged, normalized, previewed, selected, bounded, and
  idempotent; external responses never publish directly. Media uses scoped
  staging, compressed originals/thumbnails, metadata validation, publication,
  replacement cleanup, and exact orphan cleanup.
- Routes, serviceability, delivery fees, checkout, Paystack, orders,
  fulfillment, App Check enforcement, and production remain outside Phase 3.

## Dependency and cleanup state

- The root pnpm installation and lockfile are synchronized. SDK-compatible
  AsyncStorage, gesture-handler, Reanimated, Worklets, and Metro packages were
  added to the native manifests; `expo install --check` passes for both apps.
- `firebase/functions` keeps only deployable npm registry dependencies at
  runtime; shared workspace source is bundled at build time because Cloud
  Build cannot install `workspace:*` dependencies with npm.
- Both native `google-services.json` files are present locally, ignored, and
  removed from Git tracking. App-specific Android package names are declared.
- Generated builds, Expo caches, Playwright output, secrets, `.env.local`, and
  dependency directories remain ignored. The native Firebase configuration
  files remain available locally and are no longer tracked by Git.
- The Functions runtime uses the approved `firebase-functions ^7.3.0` and
  `firebase-admin ^14.2.0` pair. Its deploy manifest contains registry
  dependencies only; no `workspace:*` protocol enters Cloud Build.
- The tracked worktree was clean at Phase 3 planning start. The repository has
  one pnpm lockfile, no npm/yarn lockfile, and no tracked generated output,
  `.env.local`, or native Firebase configuration.

## Validation evidence

On 2026-07-21 the implemented checkout passed:

- Shared package and Firebase Functions type-check, lint, unit tests, and
  deployable bundle.
- Unit tests and production builds for all three web apps.
- TypeScript, lint, Jest, Expo dependency compatibility, and Android production
  export for Customer App and Driver App.
- Playwright Chromium acceptance for Admin Web, Merchant Web, and Customer Web.
- A real development-project identity matrix using exact test run
  `phase2_identity_1784610317153_749c82ef`: customer registration/verification,
  own read, protected-field denial, cross-role/user/store/driver denial,
  trusted staff lifecycle, replay denial, immediate suspended/archived stale
  token denial in Functions and Rules, Storage denial, and verified Auth plus
  Firestore cleanup.
- Owner-provided Phase 2 evidence under `docs/live-test-data-docs/` covers
  customer verification, staff invitation/setup, role/inactive boundaries,
  session behavior, and the current Customer and Driver Expo Go apps.

Phase 3 evidence on 2026-07-21 additionally records:

- Marketplace schemas, authorization/status transitions, repository
  normalization/pagination/index coverage, import validation/idempotency,
  media policy, web panels, and Customer App contract tests passed.
- All three web production builds pass with lazy marketplace panels. The
  Firebase vendor chunk is about 513 KB uncompressed for Admin/Merchant and
  496 KB for Customer, with no Vite chunk-size or circular-chunk warning.
- Four Playwright Chromium scenarios passed and generated visually inspected
  Admin, Merchant, Customer desktop, and Customer mobile screenshots under the
  ignored `test-results/` directory.
- Development Firestore/Storage Rules and indexes are deployed; all marketplace
  indexes report ready. The 13 approved marketplace Functions are active, and
  the restricted Places server key is configured without a tracked value.
- The owner-approved Cloud Run `roles/run.invoker`/`allUsers` transport binding
  is applied to exactly the 13 marketplace callable services.
- The retired `stageApiCatalogImport` Function, backing Cloud Run service, and
  `CATALOG_IMPORT_ALLOWED_HOSTS` secret are absent. Firestore inspection found
  zero API import batches and zero API-derived items, so no data records
  required deletion.
- All 13 approved marketplace callables were redeployed from the narrowed
  bundle. Authoritative post-deploy run
  `phase3_marketplace_1784796233777_d40dfad0` passed all 11 current
  marketplace, provider, scope, denial, CSV import, media, retirement, and
  stale-token cases and verified zero Auth, Firestore, import-row, audit, and
  Storage residue.
- Earlier live attempts also cleaned successfully and exposed three corrected
  issues: protected address data was incorrectly required for a merchant
  presentation update, the import-row verifier needed a composite index, and
  the Storage REST test helper needed Firebase Auth's Storage authorization
  scheme.

Post-cleanup revalidation on 2026-07-23 passed documentation, type-check, lint,
all unit/contract tests, all builds, Expo's online dependency check, both
Android exports, and four Playwright Chromium scenarios. The regenerated
Playwright screenshots are readable and contain no account data.

The same root gates were rerun after external catalog API removal. Documentation,
workspace type-check, lint, all tests, all builds, four Playwright scenarios,
both Expo compatibility checks, and fresh 4.3 MB Customer / 4.2 MB Driver
Android exports passed.

The earlier roughly 745 KB Firebase entry-chunk warning is resolved by explicit
vendor splitting and marketplace lazy loading.

On 2026-07-25, owner screenshots from self-contained Customer and Driver EAS
preview APKs on a Galaxy Note9 proved that the earlier missing-public-Firebase
launch failure is resolved. Customer renders the live marketplace and a store
menu; Driver renders retained delivery-zone scope and returns to sign-in after
sign-out. The captures contain test-account emails and do not cover every
offline, session-restoration, inactive-user, and guest/authenticated path, so
native/manual acceptance remains partial.

The latest enhanced live Playwright attempt exposed a new-store selection
timing race plus a stale continuation fixture assertion. The source-only test
corrections are present, but a live rerun is still required because the
2026-07-25 project review intentionally made no development-backend changes.

## Remaining later-phase actions

- Rotate the Paystack **test** secret before any Phase 4 payment work because
  the original value appeared in diagnostic output during setup.
- Rerun the corrected Phase 3 Playwright matrix, complete the missing native
  owner paths, and record redacted evidence before starting Phase 4. No Phase
  2 acceptance action remains.

## Next phase gate

Phase 2 is complete and overall accepted progress is 37.5%. Phase 3
(Marketplace) implementation, deployment, Playwright, and self-cleaning live
matrix are complete but it remains **0% accepted**. Both preview APKs now
launch and partial Customer/Driver device evidence exists; the corrected
Playwright rerun, missing native paths, five-app manual marketplace acceptance,
and redacted owner evidence must pass before Phase 3 or overall accepted
progress changes.
