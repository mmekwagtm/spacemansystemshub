# Phase 3 Marketplace Evidence

## Acceptance state

Phase 3 implementation, automated validation, development deployment,
self-cleaning live matrix, five-app/manual matrix, physical-device checks, and
redacted evidence are complete. Phase 3 is **100% accepted** and overall
accepted progress is **50%**.

The owner explicitly approved the Firebase callable transport
`roles/run.invoker` binding to `allUsers` on exactly the 13 Phase 3 Cloud Run
services. The binding is applied; application authentication, canonical
role/status, and store-scope authorization remain enforced inside each
callable. No unrelated service or project-wide IAM role was changed.

## Implemented surface

- Canonical store, item, import batch/row, media, pagination, filter, and command
  types plus validation schemas.
- Indexed Firestore repositories for public active catalogs, scoped merchant
  catalogs, pending onboarding, admin lists, cursor pagination, and imports.
- Client-safe services and TanStack Query providers/hooks with bounded page
  sizes and targeted invalidation.
- Trusted store submission/review/update, item upsert/availability/retirement,
  Google store staging, CSV item staging, selected idempotent import
  commit/cancel, and exact media cleanup callables.
- Scoped Firestore/Storage Rules and marketplace composite indexes.
- Admin, Merchant, Customer Web, and Customer App marketplace interfaces.
  Driver App remains regression-only.
- Browser image validation/compression, original/thumbnail staging,
  publication metadata, replacement cleanup, and orphan cleanup.
- A guarded `test:marketplace:live` script and disposable CSV fixture. The
  script tags all data with an exact random `testRunId`, removes only that
  run's Auth/Firestore/Storage data, and fails if residue remains.

## Automated evidence recorded on 2026-07-21

- Root documentation, type-check, lint, unit-test, and application/Functions
  build validation passed. Targeted validation was rerun after each live-found
  schema, index, and Storage-test correction; the final handoff repeats the
  documentation and diff whitespace checks.
- Customer App and Driver App `expo install --check` passed.
- Repository tests verify search normalization, page-size clamping, cursor
  behavior boundaries, and every bounded filtered query's index signature.
- Marketplace unit/contract coverage includes schema normalization, role/scope
  authorization, approval/status transitions, CSV import idempotency, media
  validation, historical snapshot protection, and app presentation boundaries.
- All three web apps build with lazy marketplace panels and explicit React,
  Query, and Firebase vendor chunks. The largest Firebase chunks are about
  513 KB uncompressed for Admin/Merchant and 496 KB for Customer; Vite emits no
  chunk-size or circular-chunk warning.
- Playwright Chromium passed four scenarios: Admin guest boundary, Merchant
  guest/scope boundary, Customer guest browse/protected checkout, and Customer
  phone viewport. Screenshots were generated below ignored `test-results/` and
  visually inspected for readability and clipping.

## Local revalidation recorded on 2026-07-23

- Documentation, diff whitespace, workspace type-check, lint, all unit/contract
  tests, and all builds passed after removing the native UI automation harness.
- Expo's online SDK compatibility metadata reports both native dependency sets
  up to date.
- Customer App and Driver App Android exports passed with 4.3 MB and 4.2 MB
  application bundles respectively.
- The three web production builds retained lazy marketplace panels and the
  expected split vendor chunks. Four Playwright Chromium scenarios passed in
  1.3 minutes.
- The regenerated ignored Playwright screenshots are visually readable and
  contain no account data. They prove guest/boundary rendering only, not the
  authenticated live matrix.
- After removing external JSON/HTTPS catalog import, documentation, workspace
  type-check, lint, all unit/contract tests, all builds, and diff whitespace
  passed again. Four Playwright Chromium scenarios passed in 1.3 minutes.
  Both Expo dependency checks reported up to date, and fresh Android exports
  produced 4.3 MB Customer and 4.2 MB Driver application bundles.

## Owner-authorized Playwright live matrix recorded on 2026-07-23

- The run continued from persisted development fixtures in
  `spacemansystemsbackend`; it did not delete or recreate the existing named
  records. The minimal CSV fixture was
  `tests/fixtures/phase3-playwright-items.csv`; media used the existing
  `docs/architecture-visuals-docs/spaceman-icon.png`.
- Playwright passed the authenticated Admin/Merchant/Customer Web workflows:
  API-import UI absence, manual media-backed store/item publication, CSV
  selected-row commit and replay with unchecked rows absent, Google Places
  staging/commit with the selected place already approved, merchant
  submit/reject/corrected replacement/approve, assigned-store update, and
  cross-store update denial. The current product supports a corrected
  replacement submission after rejection; it does not support editing and
  resubmitting the same rejected store record, so that narrower behavior is
  not claimed as passed.
- Playwright also passed Customer guest browse, authenticated checkout gate,
  cached/current status, unavailable-item presentation, pagination-control
  boundary (no pagination controls are currently rendered), retired-item and
  suspended-parent hiding, unrelated-catalog retention, and the required
  section-only evidence captures. The final continuation run reported `1
  passed`.
- Exact named development fixtures remain stored because the owner requested
  persistence. The two duplicate `Playwright Admin Store 20260723` records
  were set to `suspended`; the two duplicate
  `Playwright Unavailable Item 20260723` records remain active but
  `available: false`. No broad collection cleanup was run.
- A Playwright `fixme` remains for deterministic Customer catalog error-state
  injection. The Customer error alert exists in source, but Firestore Web SDK
  transport failure could not be reliably injected through the current
  browser harness. This is an evidence gap, not a claimed pass.

## Development Firebase evidence recorded through 2026-07-23

- Firebase CLI and gcloud both selected `spacemansystemsbackend`; no production
  project or emulator was used.
- Places API was enabled for the server-side store adapter. A dedicated
  API-restricted replacement key remains stored as
  `GOOGLE_MAPS_SERVER_API_KEY`. A temporary key whose value appeared in CLI
  output was deleted immediately; its value was not written to source or
  documentation.
- Phase 3 Firestore Rules, Storage Rules, and composite indexes deployed
  successfully. All deployed marketplace indexes report ready.
- The Functions runtime uses `firebase-functions ^7.3.0` and
  `firebase-admin ^14.2.0`. Cloud Build rejected an intermediate package that
  contained a workspace protocol; the deploy package was corrected to registry
  dependencies only before the successful deployment.
- The current 13 marketplace Functions are active in
  `africa-south1`: `upsertStore`, `submitMerchantStore`,
  `reviewStoreSubmission`, `updateMerchantStore`, `upsertItem`,
  `setItemAvailability`, `retireCatalogItem`, `searchStorePlaces`,
  `stageGoogleStoreImport`, `stageCsvCatalogImport`, `commitCatalogImport`,
  `cancelCatalogImport`, and `cleanupCatalogMedia`.
- On 2026-07-23 the external JSON/HTTPS catalog API source, schema, service,
  Admin UI, callable export, live-test case, and current documentation were
  removed. The exact `stageApiCatalogImport` Function was deleted; its backing
  Cloud Run service and `CATALOG_IMPORT_ALLOWED_HOSTS` secret both return not
  found. Read-only Firestore inspection found zero API import batches and zero
  API-derived items, so no marketplace records required deletion.
- Failed live attempts always completed and verified their exact cleanup. They
  exposed and drove three narrow corrections: merchant presentation updates no
  longer require protected address data, the import-row verification query has
  its required composite index, and the Storage REST helper uses Firebase
  Auth's Storage authorization scheme.
- Historical live run `phase3_marketplace_1784749355621_646a3a94` passed manual
  store/item publication, public active/unavailable reads, public search and
  pending-merchant queries, inactive-parent/retired denial, direct-write
  denial, approval/rejection/scope, cross-store command denial, CSV selection
  and replay, allowlisted API/private-network denial, Google Places staging,
  valid/invalid/published media, and suspended stale-token denial. Its API case
  is retained only as historical terminal evidence and is no longer an approved
  product requirement.
- All 13 approved marketplace callables were then redeployed from the
  CSV/Google-only bundle. Authoritative post-deploy live run
  `phase3_marketplace_1784796233777_d40dfad0` passed all 11 current cases:
  manual publication, public query boundaries, inactive-parent/retired denial,
  direct-write denial, merchant approval and scope, cross-store denial, CSV
  selected-row commit/replay, Google Places staging, media
  validation/publication, and suspended stale-token denial. It finished with
  verified zero Auth, Firestore, import-row, audit, and Storage residue.

## Reviewed visual evidence

Twenty-three replacement screenshot candidates under
`docs/live-test-data-docs/images/phase3-images/` were visually inspected:

- Admin images show manual store/item management, Google Places search and
  staging, merchant-store approval/rejection controls, CSV preview and commit,
  item availability, and retirement controls.
- Merchant images show assigned-store editing and catalog items created from
  the Admin CSV workflow.
- Customer Web and Customer App images show matching catalog names, categories,
  prices, availability presentation, and catalog media. The category-filter
  image shows visible filtering behavior.

This historical candidate set was useful visible-state coverage, but the
following files/states were not eligible as final acceptance evidence:

- Any Admin image that still shows the removed **Allowlisted API import** form
  is stale and must be recaptured after this change.
- `image-media-upload-firebase.jpg` exposes the Firebase Storage bucket and an
  internal object-path identifier and must not be included in final redacted
  evidence.
- Import-preview images expose exact batch identifiers. Final evidence must
  crop or redact those identifiers.
- Some web images show Customer Marketplace on port `5174` or Merchant on
  `5175`; final captures must use the canonical Merchant `5174` and Customer
  `5175` URLs.
- Visible “Phase 3 Development” / “Disposable live-test fixture” catalog
  records need an exact owner review. Retire controlled test records through
  normal Admin commands; never perform broad collection deletion.
- The earlier Customer App images showed a guest catalog and did not prove
  authenticated parity, session restoration, sign-out, inactive/wrong-role
  denial, stale/offline behavior, pagination, or a self-contained APK launch.
- No earlier image proved cross-store denial, invalid-media rejection and exact orphan
  cleanup, customer hiding after retirement, or the Driver App regression.

The final 2026-07-26 Playwright and Note9 captures replace those gaps; stale or
sensitive candidates remain excluded from final evidence.

## Native preview-APK rerun recorded on 2026-07-25

The first self-contained preview-APK run failed on 2026-07-24 because the
Customer and Driver bundles did not inline the public Firebase configuration.
The source now uses explicit static Expo public-environment references. A
Galaxy Note9 rerun on 2026-07-25 proves both APKs launch without Metro or Expo
Go. Driver visibly reached retained signed-in delivery-zone scope and then the
sign-in screen after sign-out. Customer visibly rendered the cached/current
marketplace, a long paginated catalog, an authenticated-account state, and a
store menu containing the manual and CSV-backed items.

That rerun is partial, not final acceptance. The raw owner screenshots expose
test-account emails, show numerous retained Playwright fixtures, and do not
prove Customer offline refresh, session restoration, inactive/wrong-role
denial, a complete guest/sign-out cycle, Driver inactive-user denial, or a
fully redacted five-app review. The raw captures are retained locally outside
tracked evidence; the redacted observations are recorded in
`docs/live-test-data-docs/terminal-data/phase3-native-device-acceptance-2026-07-25.md`.

The enhanced Playwright run first exposed a UI synchronization race when
resolving a newly created store and an outdated continuation assertion tied to
a prior unavailable-item fixture. Admin and Merchant now provide bounded store
search, a just-created Admin store remains selectable outside the first page,
and the acceptance source waits for visible records before counting them.

## Final acceptance on 2026-07-26

- Run `phase3_accept_20260726_1450` passed the core marketplace matrix `2/2`,
  persisted-state continuation `2/2`, and web foundations `4/4`.
- Admin manual/media, Google, merchant review, CSV selected-row commit/replay,
  invalid-media, retirement, and suspension checks passed. Merchant
  submit/reject/correct/resubmit/approve, assigned-store edit, and cross-store
  denial checks passed.
- Customer Web passed guest/authenticated active-catalog parity, unavailable
  state, pagination, deterministic cached-refresh feedback, retired/suspended
  hiding, and unrelated-catalog retention.
- Customer App and Customer Web showed matching public approved/active
  stores/items and hid inactive/retired data. Customer App also passed
  pagination, session restoration, sign-out, and cached offline behavior.
- Customer internal preview build
  `6e06e1a9-985b-439f-abeb-d2489c0ac25e` was installed on a Galaxy Note9 and
  passed clean online launch, automatic `Cached catalog — offline` feedback,
  cached-data retention after refresh, connectivity restoration, and empty
  Android crash-buffer checks.
- Driver App passed guest/sign-in boundaries, active role/scope and session
  restoration, sign-out, suspended-user denial, and absence of marketplace
  controls.
- The exact temporary Driver denial fixture was removed with zero Auth,
  profile, and audit residue. Playwright records requested for continued
  development review remain stored; no broad cleanup was run.
- Final native and web screenshots were visually checked and contain no email,
  password, UID, token, API key, Firebase configuration value, or device
  serial. The detailed redacted record is
  `docs/live-test-data-docs/terminal-data/phase3-native-device-acceptance-2026-07-26.md`.

Every Phase 3 exit item passes. Phase 4 is unblocked but not started. No
production deployment or push is included.
