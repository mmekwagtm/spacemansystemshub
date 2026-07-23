# Phase 3 Plan: Marketplace

## Fixed development endpoint

The architecture defines exactly eight numbered phases, `0` through `7`.
Phase 7 is the fixed completion endpoint: the project is complete only when
the production acceptance matrix passes. Phase 3 source scaffolding or a
development deployment does not count as completion without matching live,
security, cross-app, media, import, cleanup, and manual evidence.

| Phase | Name                        | Completion gate                                                                 |
| ----- | --------------------------- | ------------------------------------------------------------------------------- |
| 0     | Architecture truth          | No unresolved source-of-truth conflict                                          |
| 1     | Monorepo baseline           | Five apps compile, test, build, and smoke-test                                  |
| 2     | Identity and security       | Cross-role denial and trusted identity flows verified                           |
| 3     | Marketplace                 | Scoped catalog is consistent across admin, merchant, and customer channels      |
| 4     | Maps, checkout, and payment | Exactly one paid order per verified provider reference                          |
| 5     | Fulfillment                 | Paid-to-delivered lifecycle passes across merchant, admin, driver, and customer |
| 6     | Operations                  | Failures are visible, auditable, notified, and financially reconciled           |
| 7     | Quality and launch          | Production acceptance, monitoring, backups, runbooks, and release pass          |

## Phase objective

Implement and verify the canonical store and item marketplace against the real
development Firebase project. Admin Web must govern stores, catalog, imports,
approval, retirement, and media. Merchant Web must manage only assigned stores
and permitted catalog fields. Customer Web and Customer App must show the same
public active catalog to guests and authenticated customers.

## Included work

1. A bounded Firebase Functions runtime upgrade to the approved
   `firebase-functions ^7.3.0` and `firebase-admin ^14.2.0` dependency pair,
   followed by deployable-bundle validation before marketplace implementation.
2. Canonical store, item, catalog-media, import-batch, import-row, pagination,
   query-filter, and trusted-command contracts across shared packages.
3. Firestore repositories, client-safe services, TanStack Query hooks,
   invalidation, cursor pagination, and required composite indexes.
4. Admin manual store/item creation, Google Places store import, merchant store
   review, CSV/API item import, editing, publication, and retirement.
5. Merchant draft submission plus assigned-store profile, hours, ordering
   availability, catalog, item availability, price, category, sort, and media
   management within server-enforced scope.
6. Guest and authenticated active-store browsing on Customer Web and Customer
   App, including store/menu/item details, categories, unavailable states,
   thumbnails, pagination, and stale/offline indication.
7. Scoped Cloud Storage staging and catalog paths, browser-side compression,
   thumbnails, validated metadata, and exact orphan cleanup.
8. Unit, Rules, Playwright, native contract, real-development-Firebase, manual
   five-app regression, evidence, and documentation gates.

## Excluded work

- Routes, distance, serviceability, delivery fees, ETA, or checkout address
  verification. Google Places is used only to stage editable store data.
- Customer cart, favorites, checkout, Paystack, order creation, or payment
  verification.
- Merchant fulfillment, dispatch, driver assignment/location, refunds,
  settlements, notifications, or operations automation.
- App Check enforcement, production configuration/deployment, Hosting/EAS
  release, or unrelated visual redesign.
- Catalog realtime listeners. Marketplace reads remain cached and paginated.

## Canonical marketplace contract

### Stores

- Preserve `draft`, `active`, `suspended`, and `archived` as operational
  statuses; represent review separately as `pending`, `approved`, or
  `rejected` approval state.
- Add category, description, normalized search name, source
  (`manual`, `google_places`, or `merchant`), source reference, opening hours,
  `openForOrders`, minimum order, card/hero media, attribution, and governance
  metadata.
- Merchant submissions begin as draft/pending and never self-assign scope.
  Approval atomically updates the store, permitted merchant scope/claims, and
  audit evidence.
- Admin controls merchant ownership, approval, operational status, protected
  location/scope, and archival fields. Scoped merchants control only the
  explicitly permitted presentation and operating fields.

### Items

- Preserve `draft`, `active`, `hidden`, and `archived` status and add a
  separate availability value for temporarily unavailable items.
- Add normalized search name, category ID/label, sort order, image alt text,
  catalog media, source (`manual`, `csv`, or `api`), source reference, and
  import-batch metadata.
- Keep `storeId` immutable. Money remains integer ZAR minor units. Merchant
  changes are scoped and audited; privileged retirement remains admin-owned.
- Active item status alone is insufficient for public visibility: the parent
  store must also be active and approved.

### Imports and media

- `importBatches/{batchId}` owns source, target store, status, content hash,
  actor, counts, selection, result, timestamps, and `testRunId` when applicable.
  Reviewed rows live below their batch so large previews do not create a large
  root document.
- Every import follows stage -> normalize -> validate -> preview -> select ->
  commit/cancel. Only checked rows commit, and a stable source/store/content
  identity prevents duplicate replay.
- Google Places requests run server-side with an approved restricted key and
  field masks. Item API imports accept only approved HTTPS hosts and a
  documented JSON item shape; redirects, private/link-local destinations,
  oversized payloads, timeouts, and invalid content fail closed.
- CSV/API imports are capped at 500 candidate rows per batch. External images
  are validated and copied into Cloud Storage rather than retained as mutable
  provider URLs.
- Catalog uploads accept JPEG, PNG, or WebP only, enforce bounded size, and
  create compressed originals plus thumbnails. Staging media is private to the
  actor; published reads follow store/item visibility; cleanup is exact,
  bounded, audited, and reference-aware.

## Public interfaces and command boundaries

- Repository reads cover public active stores, public active items for an
  active store, scoped merchant stores/items, admin marketplace lists, import
  batches, filter/search input, and opaque cursor pagination with a maximum
  page size of 50.
- Query hooks use stable keys for active store filters, store detail, scoped
  catalog, item detail, admin lists, and import batches. Accepted mutations
  invalidate only affected store/catalog/import keys.
- Replace the broad marketplace upsert behavior with typed commands for
  merchant store submission, admin review, scoped store update, item upsert,
  item availability, item retirement, Google staging, CSV/API staging, import
  commit/cancel, and exact media cleanup.
- A narrow onboarding command may accept a canonical `pending_approval`
  merchant for their own draft submission. It must not unlock operational
  routes or weaken suspended/archived denial.
- Clients never write `stores`, `items`, `importBatches`, audit records, or
  protected media metadata directly.

## Milestones

### 3.1 Clean baseline and runtime maintenance

- Confirm a clean tracked worktree, one pnpm lockfile, ignored local Firebase
  inputs, and no npm/yarn/generated-file residue.
- Upgrade only the deferred Functions runtime dependencies and fix their
  compatibility surface without adding marketplace behavior.
- Exit: Functions type-check, lint, unit tests, and deployable bundle pass.

### 3.2 Contracts, repositories, Rules, and indexes

- Reconcile types, schemas, repositories, services, query keys/hooks,
  Firestore Rules, Storage Rules, and indexes as one marketplace contract.
- Deny direct writes, cross-store access, inactive actors, inactive-parent
  item exposure, and invalid media while permitting public active-catalog
  reads.
- Exit: targeted contract and authorization tests pass before UI work.

### 3.3 Store lifecycle and onboarding

- Implement admin manual/Google store staging and publication, merchant draft
  submission, admin review, scoped merchant profile/hours/open-state edits,
  and audit records.
- Keep serviceability and route calculations absent; browsing without a
  verified location must not invent fees or ETA.
- Exit: manual, Google, merchant approval, rejection, and cross-store denial
  scenarios pass.

### 3.4 Catalog, imports, and media

- Implement manual items, scoped merchant edits, availability, admin
  retirement, CSV/API staging, row selection, idempotent commit, Storage
  upload/finalization, thumbnails, and orphan cleanup.
- Preserve existing order snapshot contracts; mutable catalog changes never
  rewrite historical order data.
- Exit: replay, partial selection, malformed source, invalid media, retirement,
  and zero-residue cases pass.

### 3.5 Cross-channel marketplace experience

- Implement Admin and Merchant routes plus Customer Web/App store, menu, and
  item browsing through shared service/query contracts and app-owned UI.
- Add web route-level lazy loading, bounded lists, image lazy loading, and
  customer stale/offline states. Driver App remains a regression-only client.
- Exit: Admin publication and Merchant scoped changes produce the same active
  customer catalog on Customer Web and a self-contained Customer App preview
  APK.

### 3.6 Live acceptance and handoff

- Run root validation, Playwright, both native compatibility/export gates, the
  self-cleaning live marketplace matrix, self-contained preview-APK device
  checks, five-app smoke tests, and the manual import/media matrix.
- Update the data model, environment, cost, workflow, status, roadmap,
  live-test, and Phase 3 evidence documents to match verified reality.
- Exit: Phase 3 is 100% only when all checklist items and cleanup verification
  are complete and no high-severity marketplace/security defect remains.

## Required validation

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:web:e2e
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
```

Native manual acceptance uses the `preview` EAS profiles in both app
directories. Those profiles create internal-distribution Android APKs with the
development EAS environment and must launch on the physical test device without
Metro or Expo Go. Exact build, installation, and device checks are in
`docs/project-docs/live-test-steps.md`.

Run the development Firebase deployment and live marketplace commands only
after they are implemented and documented in
`docs/project-docs/live-test-steps.md`. Do not use emulators or production.

## Manual live acceptance matrix

1. Admin manually creates and publishes a store/item with catalog media.
2. Admin stages a Google store, reviews editable data, and publishes it.
3. Merchant submits a draft; admin rejection remains private and approval
   applies exact scope without allowing self-approval.
4. Scoped merchant edits hours, open state, item presentation, price,
   availability, category, sort, and media; cross-store actions fail.
5. Admin previews CSV and allowlisted API candidates, commits selected rows,
   and confirms replay creates no duplicates.
6. Customer Web and the self-contained Customer App preview APK show identical
   active stores/items to guests and authenticated customers;
   draft/suspended/archived parents and retired items remain hidden.
7. Media thumbnails render, invalid uploads fail, retirement updates customer
   reads, and exact cleanup leaves no tagged Firestore/Auth/Storage residue.
8. Driver App identity/scope regression remains unchanged.

## Phase 3 exit checklist

- [x] Deferred Functions runtime upgrade passes its bounded compatibility gate.
- [x] One canonical marketplace contract is used across types, validation, repositories, services, queries, Rules, indexes, Functions, and docs.
- [ ] Admin manual, Google, merchant-review, CSV, API, publish, edit, and retire workflows pass.
- [ ] Merchant onboarding and catalog/store changes remain approval-aware and store-scoped.
- [ ] Customer Web and Customer App expose only consistent public active catalog data.
- [x] Firestore and Storage cross-store, inactive, inactive-parent, direct-write, import, and media denials pass.
- [x] Imports are reviewed, selected, idempotent, bounded, and allowlisted.
- [x] Catalog media is compressed, thumbnail-backed, scoped, and exactly cleaned.
- [x] Pagination, caching, invalidation, lazy loading, and bundle warnings meet the Phase 3 performance gate.
- [x] Root validation, Playwright, native compatibility/export checks, live Firebase, and source documentation evidence pass.
- [ ] Preview-APK physical-device checks, five-app smoke, manual acceptance, and redacted owner evidence pass.
- [x] Exact `testRunId` cleanup verifies zero Firestore, Auth, import, audit, and Storage residue.

Phase 4 may not begin until every checklist item is complete.

## Execution status: implementation complete; 0% accepted

The bounded source implementation, runtime upgrade, shared contracts, app
interfaces, automated tests, Rules/indexes, Functions deployment, provider
configuration, Playwright screenshots, and self-cleaning development live
matrix are complete. Exact live run
`phase3_marketplace_1784749355621_646a3a94` passed all cases and verified zero
Auth, Firestore, import-row, audit, and Storage residue.

The live matrix found and drove three narrow corrections before its all-pass
run: merchant presentation updates no longer require protected address data,
the import-row verification query has its composite index, and the live
Storage helper uses Firebase Auth's Storage authorization scheme.

On 2026-07-23, the post-cleanup source gate passed documentation, type-check,
lint, unit/contract tests, all workspace builds, Expo's online dependency
compatibility check, both Android exports, and four Playwright Chromium
scenarios. The current preview APKs still require owner-operated physical-device
acceptance.

Accepted progress remains 0% until the owner completes the five-app/manual
acceptance matrix and records redacted evidence. Phase 4 remains blocked and
overall accepted project progress remains 37.5%.
