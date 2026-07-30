# Current Status

## Accepted baseline

- Phase 0 (architecture truth), Phase 1 (monorepo baseline), Phase 2
  (identity and security), Phase 3 (marketplace), and Phase 4 (Maps, checkout,
  and payment) are complete.
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

## Phase 3 accepted state

Phase 3 (Marketplace) source implementation is complete against the bounded
contract in `docs/plans-docs/PLAN-phase-3.md`. Its development-live,
automated, five-app/manual, physical-device, and redacted evidence gates pass.

- Shared types, validation, repositories, services, TanStack Query hooks,
  Firestore/Storage Rules, indexes, trusted Functions, and app-owned interfaces
  implement one marketplace contract.
- Admin supports manual store/item work, merchant review, Google staging,
  CSV preview and selected commit, media, and retirement. Merchant supports
  pending onboarding and assigned-store/catalog changes. External JSON/HTTPS
  catalog API import is prohibited and removed.
- Customer Web and Customer App use the same guest-readable active catalog,
  categories, unavailable-item state, thumbnails, bounded pagination, and
  stale/error feedback. Customer App additionally distinguishes offline cache
  success from a reachable backend. Driver App remains a regression-only
  client.
- Imports are staged, normalized, previewed, selected, bounded, and
  idempotent; external responses never publish directly. Media uses scoped
  staging, compressed originals/thumbnails, metadata validation, publication,
  replacement cleanup, and exact orphan cleanup.
- Routes, serviceability, delivery fees, checkout, Paystack, orders,
  fulfillment, App Check enforcement, and production remain outside Phase 3.

## Phase 4 accepted state

Phase 4 (Maps, checkout, and payment) source and complete local source gate
pass. Deployment, backend matrices, Customer Web, combined Galaxy Note9 Expo Go
and native-payment evidence, exact cleanup, and owner review also pass. The
owner explicitly accepted Phase 4 on 2026-07-29.

- Customer Web and Customer App share a versioned one-store cart, authoritative
  address/quote workflow, hosted Paystack launch, focus/resume reconciliation,
  manual payment check, and offline blocking.
- Admin Web manages ZA delivery zones, immutable fee-rule versions, and
  super-admin enable flags. No provider secret is displayed or stored by a
  client.
- Trusted Functions own Places/Routes requests, ten-minute checkout quotes,
  deterministic provider references, Paystack initialization/verification,
  signed webhook handling, and exactly-once order creation.
- Firestore Rules preserve customer ownership and Function-only writes while
  adding staff-only configuration reads. The required customer-order and
  fee-rule indexes are declared.
- On 2026-07-28, the Maps server key was restricted to the Places backend,
  Places API (New), and Routes services. The address callable was redeployed,
  returned five Mabopane suggestions on the Galaxy Note9, and no longer
  surfaces the incorrect identity-service error.
- Development Rules/indexes and all nine Phase 4 Functions deployed
  successfully; all nine services returned the expected public transport
  invoker binding.
- Live runs `phase4_checkout_1785263019703_447d3a33` and
  `phase4_checkout_1785263181986_e559bf05` passed the Maps, security,
  unpaid/no-order, successful-payment, exactly-once, and repeat-verification
  cases with exact Auth and Firestore cleanup.
- Later successful run `phase4_checkout_1785274758928_78d1be8d` repeated the
  exactly-once and repeat-verification path with exact Auth and Firestore
  cleanup.
- Phase 3 Playwright regression passed 8/8. Isolated Phase 4 Customer Web run
  `phase4_playwright_1785267576141_fde0c50e` passed 1/1.
- Focused and root documentation, type-check, lint, 76 tests, all builds,
  Expo compatibility/Doctor, and non-mutating web foundations pass. A fresh
  Customer App Android export also passed on 2026-07-29.
- Raw Galaxy Note9 captures show address selection, a quote, hosted test
  payment, return, paid-order reconciliation, and an abandoned/no-order state.
  The later tagged Expo Go rerun cleared the persisted cart, rendered `store to
  r`, added `Kiddos Meal`, completed sign-in, selected a Mabopane address, and
  displayed the R47.57 / 7.4 km / R97.57 server quote. Its exact cleanup
  deleted one checkout session and returned zero remaining. The targeted
  crash/error query returned no matching markers. The owner accepted this
  combined evidence without claiming that every behavior and payment outcome
  ran in the same tagged native session; the missing same-run matrix remains a
  post-acceptance test-depth risk.
- The named Maps server-key resource is proven restricted to the exact three
  approved APIs, and raw Admin/provider captures show active configuration.
- Two signed webhook replays of retained reference
  `spc_checkout-d405ae2dc61a92bd` returned `reconciled:true,status:paid`; the
  retained checkout is consumed with exactly one paid order and one payment
  event, but it has no `testRunId` and is not cleanup evidence. Paystack secret
  version `2` was disabled before this replay was evidenced.
- Customer App passes an optional development-only
  `EXPO_PUBLIC_PHASE4_TEST_RUN_ID` to checkout creation. The tagged Expo Go
  quote exercised that wiring and cleaned up exactly. The retained native order
  remains untagged and is not counted as tagged cleanup evidence.
- The reviewed base revision is
  `128c58ea5d8f8f3c74b8e34f74d67f5e2a6b1fa0`; the present Customer App
  acceptance harness also contains a seven-line uncommitted `testRunId` delta.
  The deployment record is not bound cryptographically to an exact clean
  revision.
- Earlier captured quotes show 219.5–238.3 km routes for Mabopane addresses
  while clamping delivery to R80. The active development store origin was
  corrected through `upsertStore` from longitude `26.1007` to `28.1007`; a
  fresh tagged quote now returns 7,391 m / 791 s and R47.57 delivery, leaving
  zero tagged checkout residue. The owner accepted this exact-locality route
  and fee policy for Phase 4. A versioned maximum-distance boundary remains a
  post-acceptance product/configuration improvement.
- One native capture exposes historical Phase 3-named stores in the customer
  catalog, and other captures show a generic service error persisting after
  cart/account state changes. Neither is final acceptance evidence.
- Root validation now includes a dependency-free architecture-boundary gate.
  It rejects app-to-app and package-to-app imports, direct Firebase imports outside
  explicit app adapters, and web/native cross-imports.

## Dependency and cleanup state

- The root pnpm installation and lockfile are synchronized. SDK-compatible
  AsyncStorage, gesture-handler, Reanimated, Worklets, Metro, and Customer App
  `expo-network` packages are declared in the native manifests. Customer Web
  and Customer App now depend on shared `app-state`; no hosted-checkout client
  SDK or WebView dependency was added.
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

Final Phase 3 acceptance on 2026-07-26 passed the corrected web and native
gates:

- Playwright run `phase3_accept_20260726_1450` passed the core matrix `2/2`,
  persisted-state continuation `2/2`, and web foundations `4/4`.
- Admin and Merchant now expose bounded store search, and a newly created
  Admin store remains immediately selectable even when it falls outside the
  first paginated list.
- Customer Web and Customer App exposed matching public approved/active
  catalog records, prices, availability, pagination, and hidden
  retired/inactive records.
- Both self-contained preview APKs passed Galaxy Note9 launch and manual
  regression without Metro or Expo Go. Customer internal preview build
  `6e06e1a9-985b-439f-abeb-d2489c0ac25e` also passed explicit cached-offline,
  refresh, restored-connectivity, and empty-crash-buffer checks.
- Redacted evidence is stored under `docs/live-test-data-docs/`; the exact
  temporary Driver denial fixture was removed with zero verified residue.

## Remaining later-phase actions

- Begin Phase 5 with the paid-to-delivered lifecycle across Merchant, Admin,
  Driver, and Customer, including assignment-version safeguards.
- The Phase 4 production-hardening recommendations now have reviewed
  repository implementations: quote/token/popup recovery, authoritative
  transactional reconciliation, behavioral tests, strict exact cleanup,
  run-specific evidence, an Expo Go cleanup helper, optional versioned maximum
  distance, distributed Maps quotas, staged App Check configuration, and safe
  rotation-grace-period/deployment-evidence tooling.
- Manual Paystack rotation grace-period proof and an evidenced deployment
  remain external actions. No live maximum-distance value was configured.
- Build and accept self-contained EAS preview APKs only at the end of Phase 7
  as part of final quality and launch.
- Register and validate App Check providers, then enable enforcement only at
  the end of the approved Phase 7 deployment gate.
- No Phase 0 through Phase 4 acceptance action remains.

## Next phase gate

Phase 4 is **100% accepted** and overall accepted progress is **62.5%**. Phase
5 (Fulfillment) is next. Overall progress must not move to **75%** until the
Phase 5 exit gate passes and the owner explicitly accepts its evidence.
