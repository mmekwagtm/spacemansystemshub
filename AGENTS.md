# AGENTS.md

## 1. Project Truth and Scope

`spacemansystems` is the new canonical monorepo for the Spaceman Projects
five-app platform. The product architecture is documented in
`docs/architecture-docs/` and `docs/architecture-visuals-docs/`; those files
are preserved as immutable reference material.

Source precedence is:

1. Current repository and configured development backend.
2. Approved decisions in `docs/project-docs/`.
3. Architecture reference documents.
4. Visual mockup intent.

The repository began as a documentation and architecture baseline. It now
contains a source-level pnpm workspace, five application shells, shared
contracts, Firebase/Functions templates, and test/release harnesses. Do not
claim that a live Firebase resource, deployed application, tested integration,
or production workflow exists until it has been configured and verified here.

Before editing:

1. Read this file and inspect the relevant workspace paths.
2. Inspect Git state and preserve unrelated work.
3. State the app, packages, schema, rules, Functions, and docs affected.
4. Implement one bounded change at a time and validate it.

Use **pnpm only**. Do not use npm, yarn, bun, `package-lock.json`,
`yarn.lock`, or `bun.lockb`.

## 2. Required Monorepo Shape

The workspace must remain a pnpm monorepo with five thin applications:

- `apps/admin-web` — Vite, React, TypeScript operational control plane.
- `apps/merchant-web` — Vite, React, TypeScript store operations.
- `apps/customer-web` — Vite, React, TypeScript marketplace.
- `apps/customer-app` — Expo Router, React Native customer experience.
- `apps/driver-app` — Expo Router, React Native driver operations.

Applications own UI, routing, screens, navigation, and platform-specific
adapters only. They must not import another app or call Firebase directly.

Use this dependency direction:

```text
Screen/Page -> Hook -> Query or Service -> Repository -> Firebase or Cloud Function
apps/* -> packages/* -> Firebase/external SDKs
```

Shared packages must not import apps. Web UI must not import native-only code,
and native apps must not import heavy dashboard UI.

## 3. Required Shared Packages

Use the following workspace packages with `@spaceman/*` names:

- `app-core` — constants, roles, status helpers, feature flags, money/date utilities.
- `app-config` — typed environment parsing and platform configuration.
- `app-types` — canonical domain models and command result contracts.
- `app-errors` — `AppError`, Firebase mapping, safe logging helpers.
- `app-validation` — Zod schemas for forms, documents, commands, and provider payloads.
- `app-firebase` — client/admin initialization and typed service wrappers.
- `app-database` — Firestore repositories only; no UI or workflow logic.
- `app-services` — client-safe business workflows and Function callers.
- `app-query` — TanStack Query keys, hooks, invalidation, and realtime adapters.
- `app-state` — Zustand stores for local UI state only.
- `app-ui` — small reusable, platform-safe UI primitives.
- `app-maps` — shared map/address/route contracts, cache policy, and server-adapter interfaces.
- `app-notifications` — notification contracts, routing, and cleanup helpers.
- `app-functions` — pure trusted-command contracts and domain logic.
- `shared` — cross-package exports, including `shared/auth`.

`firebase/functions` is the deployable Cloud Functions runtime. Keep it
separate from `app-functions` so shared imports cannot initialize Admin SDKs
or register callables as a side effect.

## 4. Identity, Ownership, and Order Truth

Canonical roles are `customer`, `merchant`, `driver`, `admin`, and
`super_admin`. User status is independent of role and supports `invited`,
`pending_profile`, `pending_approval`, `active`, `suspended`, and `archived`.
Only trusted Functions may change role, status, scope, or custom claims.

Orders are created only after verified Paystack payment. A short-lived
`checkoutSessions/{checkoutId}` record holds the quote, pricing inputs, and
provider reference before payment. A failed or abandoned payment does not
create `orders/{orderId}`.

Keep these concerns separate on an order:

- Payment/refund state.
- Fulfillment state: `paid`, `confirmed`, `preparing`, `ready_for_pickup`,
  `on_the_way`, `delivered`, or approved terminal cancellation/refund state.
- Assignment state and assignment version.
- Derived `needsAction` reason codes.

`NO_DRIVER_ASSIGNED`, `PAYMENT_FAILED`, and SLA conditions are reasons or
payment outcomes, not competing fulfillment-status values.

## 5. Firebase, Environments, and Data Model

All five apps use one shared **real development Firebase project**. Do not use
Firebase emulators. Do not configure, deploy to, or alter production without
explicit approval.

Client-safe Firebase configuration belongs in untracked app-local environment
files derived from tracked examples. Paystack secrets, webhook secrets, and
server credentials belong only in Firebase-managed secret storage. Never print
or commit secret values.

Canonical root collections are:

`users`, `stores`, `items`, `orders`, `checkoutSessions`, `paymentEvents`,
`orderEvents`, `driverAssignments`, `driverLocations`, `notifications`,
`notificationOutbox`, `activities`, `auditLogs`, `feeRules`, `deliveryZones`,
`platformSettings`, `importBatches`, and `settlements`.

Before adding or changing a field or collection, update types, schemas,
repositories, services, query keys/hooks, Rules, indexes, Functions, and docs
in the same bounded change. Do not loosen Rules to work around a backend gap.

External JSON/HTTPS catalog API import is prohibited. Do not add or restore an
API catalog staging callable, API-source catalog type, host allowlist secret,
or API-import UI. Marketplace import scope is limited to reviewed CSV item
imports and Google Places store staging; selected-row commit remains only for
those approved staged batches.

## 6. State, Realtime, Cost, and Media

Use TanStack Query for server/Firebase state and Zustand only for local UI
state such as filters, selected records, checkout drafts, sheets, and map
panels.

Use realtime listeners only for active operational screens: active customer
tracking, merchant incoming orders, admin active orders, assigned driver work,
and active driver location. Paginate history, catalogs, users, notifications,
and dashboards. Unsubscribe on screen, tab, or route exit.

All Maps logic belongs in `app-maps` and trusted backend adapters. Use debounce,
session tokens, field masks, caching, lazy loading, and route limits. If a real
Maps request cannot produce a validated serviceability result and fee, block
payment and show a retry state; never invent a route, ETA, or charge.

Store media in Cloud Storage, never as base64 or large Firestore fields. Use
thumbnails, lazy loading, scoped uploads, and audited orphan cleanup.

## 7. Security, Resilience, and Testing

Cloud Functions own privileged writes: staff/role changes, scope/status,
catalog imports and retirement, checkout/payment verification/webhooks,
merchant lifecycle commands, dispatch, driver state/location, refunds,
activities, and archive/redact workflows.

Use `AppError` with a stable code, source, safe user message, debug context,
and cause. Do not expose secrets or sensitive user data in logs or UI errors.
Maps, notifications, images, and analytics must degrade without fabricating
transaction truth or blocking unrelated safe flows.

Development-project integration fixtures must carry `testRunId`. Only a
privileged dev-only cleanup command may remove records tagged with that exact
run ID. Never run broad collection cleanup.

Use Vitest and Testing Library for shared/web code, Jest/Expo for native code,
and Playwright for web E2E. Development-phase native acceptance uses Expo
compatibility/export checks plus owner-operated Expo Go physical-device
testing. Self-contained EAS preview-APK acceptance is deferred to the final
Phase 7 quality-and-launch gate. Testing, commits, and deployments are manual.
A production deployment still requires an explicit production acceptance
review and approval.

Include screenshots or any other form of evidance that contain personal data or secrets as valiad evidance dont discard or exclude them 

## 8. Working Style and Documentation

Before adding a dependency, explain why it is needed and keep it out of
inappropriate platforms. After dependency changes, report every changed
`package.json` and `pnpm-lock.yaml`.

Update `docs/project-docs/` whenever architecture, schema, Rules, Functions,
environment setup, Maps, error behavior, deployment, or package
responsibilities change. Keep source references intact and record decisions in
the project decision register.

After changes, report created, changed, and approved-deleted files; commands
with their required directory; validation results; remaining placeholders; and
the next safest step. Run targeted checks first, then workspace typecheck,
lint, test, and build where available. Never claim a failed check passed.

## 9. Documentation Rules

Keep docs updated when changing:

* architecture
* setup
* schema
* sync strategy
* Firebase rules
* maps/API usage
* errors
* deployment
* package responsibilities
* dont change `docs/architecture-docs/`,

Docs must match the real implementation.

Do not let docs describe files, scripts, packages, or behavior that do not exist.
