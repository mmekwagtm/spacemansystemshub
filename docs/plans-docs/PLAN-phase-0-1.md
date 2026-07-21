# Spaceman Systems: Documentation Truth + Five-App Implementation Roadmap

## Summary

- Preserve all six architecture source documents and six visual originals as immutable reference material; their page/slide counts match their Markdown counterparts.
- Treat this checkout as a new, documentation-only canonical workspace. Replace all 36 `<FILL-IN>` markers and remove stale claims that code, Firebase configuration, tests, or deployments already exist.
- Build a fresh pnpm-only monorepo, then progress through shared contracts, marketplace, verified payments, fulfillment, operations, and gated releases.

## Documentation and governance

- Rewrite `AGENTS.md` as the operating contract for `spacemansystems`: source precedence, real-development-Firebase-only policy, package boundaries, five roles including `super_admin`, root collection contract, no direct Firebase from screens, test-fixture cleanup, and required reporting/validation.
- Replace every placeholder and corrupted/stale statement in `docs/project-docs/*`; make `current-status.md` accurately state “documentation/architecture baseline only” until implementation lands.
- Add a decision register, data-model contract, architecture source map, and root README. These become the operational truth; `docs/architecture-docs/*` and `docs/architecture-visuals-docs/*` remain preserved source references.
- Resolve blueprint inconsistencies explicitly: use separate payment, fulfillment, assignment, and needs-action fields rather than making `driver_assigned` or `NO_DRIVER_ASSIGNED` competing order-status values.

## Phase 0–1: Repository and workspace baseline

- Initialize a fresh Git repository on `main`; keep validation, live testing,
  commits, and deployments manual and documented in the project runbook.
- Create the root pnpm workspace, pnpm enforcement, TypeScript/eslint/test configuration, environment examples, Firebase configuration, and documentation scripts.
- Create thin apps:
  - Vite + React + TypeScript: `admin-web`, `merchant-web`, `customer-web`.
  - Expo Router + React Native: `customer-app`, `driver-app`.
- Create `@spaceman/app-*` packages: core, config, types, errors, validation, Firebase, database, services, query, state, UI, maps, notifications, functions, plus `@spaceman/shared` for shared auth.
- Configure one shared real Firebase development project for all five apps. Do not use emulators or production credentials. Store client-safe config in app-local environment files and server secrets only in Firebase-managed secret storage.

## Core contracts and backend

- Define `AppRole` as `customer | merchant | driver | admin | super_admin`; use a single canonical role, user status, role-specific scope, and mirrored custom claims managed only by trusted Functions.
- Define the canonical root collections: `users`, `stores`, `items`, `orders`, `checkoutSessions`, `paymentEvents`, `orderEvents`, `driverAssignments`, `driverLocations`, `notifications`, `notificationOutbox`, `activities`, `auditLogs`, `feeRules`, `deliveryZones`, `platformSettings`, `importBatches`, and `settlements`.
- Create `orders/{orderId}` only after verified Paystack payment. `checkoutSessions` holds expiring quotes, authoritative pricing inputs, and provider references; failed or abandoned payments never become fulfillment orders.
- Keep payment/refund state separate from fulfillment state. Fulfillment progresses through `paid → confirmed → preparing → ready_for_pickup → on_the_way → delivered`, with cancellation/refund terminal paths; assignment and needs-action reason codes are independent, auditable projections.
- Implement shared schemas, repository interfaces, typed errors, query keys, and trusted commands before app workflows. Sensitive commands cover staff creation/status, store/catalog changes, checkout/payment/webhooks, merchant transitions, dispatch/driver actions, activities/refunds, and dev-only fixture seed/cleanup.
- Enforce role/scope/transition rules in Firestore, Storage, and Functions; privileged client writes always go through Functions.

## Product delivery phases

1. **Identity and security:** email/password customer auth, invite-based staff provisioning, profile/status/scope guards, App Check plan, dev-project rules tests.
2. **Marketplace:** admin and merchant store/catalog management, manual store/item workflows first, then reviewed CSV/API imports; customer web/app browse active serviceable catalog.
3. **Maps, quotes, and payment:** backend-owned Google Maps validation/routes, Mabopane V1 fee rule, checkout sessions, Paystack initialization/webhook verification, and fail-closed checkout when a fee cannot be verified.
4. **Fulfillment:** paid merchant queue, merchant confirm/prepare/ready commands, audited admin dispatch, Driver App foreground-only active-delivery location, no media proof in V1, and customer tracking without map-dependent status loss.
5. **Operations:** recipient-scoped in-app notifications plus FCM for native apps, activities, refunds, archive/redact account workflow, settlement ledger, audit/reconciliation, and scheduled cleanup/SLA monitors.
6. **Release readiness:** Hosting for web, Expo EAS for mobile, manual
   acceptance/deployment gates, observability, backups/runbooks, and production
   rollout only after cross-app acceptance passes.

## Validation and acceptance

- Phase 0 verifies that no `<FILL-IN>` markers or false implementation claims remain and that source-to-decision traceability is complete.
- From `/home/mmekwa/Desktop/projects/spacemansystems` after Phase 1: run `corepack pnpm install`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build`.
- Use Vitest/Testing Library for shared and web packages, Jest/Expo for native packages, Playwright for web journeys, and Maestro against Expo development builds.
- Run integration/security tests against the shared dev Firebase project using records tagged by `testRunId`; privileged cleanup may delete only that run’s fixtures.
- Require tested paths for guest browse, protected ownership denial, exactly-once paid-order creation, webhook replay, merchant lifecycle, assignment race prevention, foreground tracking stop, refund reconciliation, and archive/redact account handling.

## Assumptions and locked decisions

- The workspace is greenfield; no existing Firebase, EAS, collection, or deployment identifiers are assumed.
- Actual dev Firebase project details, Paystack secrets, Maps credentials, and EAS project IDs are external prerequisites for their respective phases; production configuration remains out of scope until release readiness.
- One shared real development Firebase project serves all five apps; no emulator workflow is used.
- Architecture references remain intact; new decision/data-model documents supersede only the source documents’ intentionally unresolved implementation details.
