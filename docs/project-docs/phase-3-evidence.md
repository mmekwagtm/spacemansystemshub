# Phase 3 Marketplace Evidence

## Acceptance state

Phase 3 implementation, automated validation, development deployment, and the
self-cleaning live matrix are complete, but Phase 3 remains **0% accepted** and
overall accepted progress remains **37.5%**. A reviewed implementation commit
does not replace the owner-operated five-app/manual matrix.

The owner explicitly approved the Firebase callable transport
`roles/run.invoker` binding to `allUsers` on exactly the 14 Phase 3 Cloud Run
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
  Google/CSV/API staging, selected idempotent import commit/cancel, and exact
  media cleanup callables.
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
  authorization, approval/status transitions, import idempotency and API
  allowlisting, private-network denial, media validation, historical snapshot
  protection, and app presentation boundaries.
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

## Development Firebase evidence recorded through 2026-07-22

- Firebase CLI and gcloud both selected `spacemansystemsbackend`; no production
  project or emulator was used.
- Places API was enabled for the server-side store adapter. A dedicated
  API-restricted replacement key and the item-import host allowlist are stored
  in Secret Manager. A temporary key whose value appeared in CLI output was
  deleted immediately; its value was not written to source or documentation.
- Phase 3 Firestore Rules, Storage Rules, and composite indexes deployed
  successfully. All deployed marketplace indexes report ready.
- The Functions runtime uses `firebase-functions ^7.3.0` and
  `firebase-admin ^14.2.0`. Cloud Build rejected an intermediate package that
  contained a workspace protocol; the deploy package was corrected to registry
  dependencies only before the successful deployment.
- The exact 14 marketplace Functions deployed successfully in
  `africa-south1`: `upsertStore`, `submitMerchantStore`,
  `reviewStoreSubmission`, `updateMerchantStore`, `upsertItem`,
  `setItemAvailability`, `retireCatalogItem`, `searchStorePlaces`,
  `stageGoogleStoreImport`, `stageCsvCatalogImport`, `stageApiCatalogImport`,
  `commitCatalogImport`, `cancelCatalogImport`, and `cleanupCatalogMedia`.
- Failed live attempts always completed and verified their exact cleanup. They
  exposed and drove three narrow corrections: merchant presentation updates no
  longer require protected address data, the import-row verification query has
  its required composite index, and the Storage REST helper uses Firebase
  Auth's Storage authorization scheme.
- Exact live run `phase3_marketplace_1784749355621_646a3a94` passed manual
  store/item publication, public active/unavailable reads, public search and
  pending-merchant queries, inactive-parent/retired denial, direct-write
  denial, approval/rejection/scope, cross-store command denial, CSV selection
  and replay, allowlisted API/private-network denial, Google Places staging,
  valid/invalid/published media, and suspended stale-token denial.
- That successful run finished with `Live marketplace fixture cleanup completed
  and verified.` Auth, Firestore, import rows, audit records, and Storage had
  zero residue for the exact `testRunId`.

## Reviewed visual evidence

Nine redacted, Phase-3-relevant screenshots are retained under
`docs/live-test-data-docs/images/phase3-images/`:

- Six Admin/Merchant screenshots show pending and active store states, selected
  CSV preview rows, published-item/retirement controls, availability controls,
  and merchant approved/rejected/pending states.
- Two Customer Web screenshots show the guest active-catalog boundary and
  published item/media presentation.
- One Customer App screenshot shows the guest active-catalog boundary.

These screenshots support the visible-state review but do not by themselves
prove command authorization, cross-store denial, replay behavior, session
restoration, or cleanup. Screenshots that exposed emails or Firebase
identifiers, and obsolete setup/build screens, were removed from the repository
evidence set.

## Remaining owner acceptance

1. Complete the Admin/Merchant/Customer Web matrix in
   `live-test-steps.md` section 10. Record expected versus actual results for
   manual/Google publication, merchant approval/rejection and scoped edits,
   cross-store denial, CSV/API selected commit and replay, invalid media,
   retirement, and inactive-parent customer hiding.
2. Build and install both self-contained EAS preview APKs as documented in
   section 11. Customer App must pass guest/authenticated catalog parity,
   session restoration, sign-out, and inactive-data denial without Metro.
3. On the Driver App preview APK, pass guest/sign-in boundaries, retained driver
   role and delivery-zone scope, **Delivery operations**, session restoration,
   sign-out, inactive-user denial, and absence of marketplace controls.
4. Save only redacted expected/actual logs and screenshots under
   `docs/live-test-data-docs/`. Do not retain emails, UIDs, app identifiers,
   tokens, API keys, passwords, or Firebase console identifiers.
5. If any source, Rules, indexes, Storage policy, or Function changes while
   closing these gaps, rerun root validation, Playwright, both native
   compatibility/export gates, and the exact live marketplace matrix. Require
   a new successful `testRunId` with verified zero residue.
6. Review the evidence, check every remaining Phase 3 exit item, and only then
   change Phase 3 and overall accepted progress.

No Phase 4 work, production deployment, or push is included. A local source
checkpoint commit does not represent Phase 3 acceptance.
