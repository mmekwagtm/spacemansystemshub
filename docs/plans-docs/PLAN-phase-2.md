# Phase 2 Plan: Identity and Security

## Fixed development endpoint

The architecture defines exactly eight numbered phases, `0` through `7`.
Phase 7 is the fixed completion endpoint: the project is complete only when
the production acceptance matrix passes. Source scaffolding does not count as
phase completion without the matching live, security, test, and operational
evidence.

| Phase | Name | Completion gate |
| --- | --- | --- |
| 0 | Architecture truth | No unresolved source-of-truth conflict |
| 1 | Monorepo baseline | Five apps compile, test, build, and smoke-test |
| 2 | Identity and security | Cross-role denial and trusted identity flows verified |
| 3 | Marketplace | Scoped catalog is consistent across admin, merchant, and customer channels |
| 4 | Maps, checkout, and payment | Exactly one paid order per verified provider reference |
| 5 | Fulfillment | Paid-to-delivered lifecycle passes across merchant, admin, driver, and customer |
| 6 | Operations | Failures are visible, auditable, notified, and financially reconciled |
| 7 | Quality and launch | Production acceptance, monitoring, backups, runbooks, and release pass |

## Phase objective

Implement and verify the shared identity/security foundation against the real
development Firebase project. All five apps must use one role/status/scope
contract, protected routes must reject the wrong actor, and privileged changes
must execute only through trusted Functions.

## Included work

1. Customer email/password sign-up, sign-in, sign-out, session restoration,
   verification/error states, and guest browsing boundaries.
2. Invite/provisioned staff sign-in for merchant, driver, admin, and
   super-admin roles.
3. Canonical `users/{uid}` role, status, and scope validation plus mirrored
   custom claims managed by trusted Functions.
4. Shared route/access guards for active status, role, ownership, merchant
   store scope, driver assignment scope, and super-admin-only operations.
5. Firestore and Storage Rules tests for own-resource access, cross-role
   denial, cross-store denial, cross-driver denial, immutable protected fields,
   and suspended/archived denial.
6. Development-only fixture seeding and exact `testRunId` cleanup through
   authenticated trusted commands.
7. App Check rollout plan and enforcement decision for each web/native client;
   enforcement is enabled only after development verification avoids lockout.
8. Manual test evidence and documentation updates for every Phase 2 gate.

## Excluded work

- Store/catalog implementation beyond the minimum identity test fixture.
- Maps routes, delivery-fee calculation, Paystack initialization/webhooks, or
  order creation.
- Merchant fulfillment, driver assignment/location, refunds, settlements, or
  production deployment.
- UI restyling unrelated to identity/security acceptance.

## Milestones

### 2.1 Identity contract reconciliation

- Reconcile `AppRole`, user status, store/driver scopes, claims, schemas,
  repositories, Functions, Rules, and project docs.
- Remove duplicate/stale identity contracts and direct client authority.
- Exit: one canonical contract compiles across all consumers.

### 2.2 Customer and staff authentication

- Wire shared Firebase Auth adapters through services/hooks, not directly from
  screens.
- Implement customer guest/auth boundaries and staff role/status guards.
- Exit: all five apps restore sessions and route only authorized active users.

### 2.3 Trusted provisioning and claims

- Verify invite/staff provisioning, role/status/scope commands, custom-claim
  synchronization, token refresh, suspension, and archive behavior.
- Record audit evidence and stable errors without exposing sensitive data.
- Exit: clients cannot self-promote or alter protected identity fields.

### 2.4 Rules and abuse-resistance tests

- Run authenticated development-project security cases using exact tagged
  fixtures and privileged cleanup.
- Cover own/cross-user, cross-store, cross-driver, immutable-field,
  suspended/archived, replay, and invalid-transition denial.
- Exit: every required denial is observed and fixture cleanup is verified.

### 2.5 Cross-app acceptance

- Execute the manual source-quality gate, Playwright, both native Jest suites,
  five-app smoke test, and identity-specific live test matrix.
- Update current status, roadmap percentage, decisions, data model, auth docs,
  workflow, and live-test evidence.
- Exit: Phase 2 is 100% only when all acceptance evidence is current and no
  high-severity identity/security defect remains.

## Required validation

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:web:e2e
```

Run the five app smoke tests and development Firebase identity/security gate
from `docs/project-docs/live-test-steps.md`. Do not use emulators or production.

## Phase 2 exit checklist

- [x] One canonical role/status/scope/claim contract is used everywhere.
- [x] Customer guest and authenticated flows compile, test, and export on web and native.
- [x] Merchant, driver, admin, and super-admin routes enforce active role/scope.
- [x] Trusted provisioning/claim/status commands pass live development tests.
- [x] Cross-role, ownership, immutable-field, scoped, and inactive-user denials pass.
- [x] App Check rollout decision and non-lockout evidence are documented.
- [x] Tagged fixtures are removed only by exact privileged cleanup.
- [x] Manual validation, Playwright, native tests, and five-app smoke tests pass.
- [x] Documentation and roadmap evidence match the live checkout.

The Phase 2 exit gate is complete. Phase 3 may begin only from its approved,
bounded plan.

## Execution status: 100%

Source, development-cloud deployment, package validation, web builds,
Playwright, native Jest/type-check/export, and the self-cleaning real-Firebase
security matrix passed on 2026-07-21. Test run
`phase2_identity_1784610317153_749c82ef` verified customer bootstrap and
verification, trusted staff invitation/scope/activation, protected-field and
cross-role/user/store/driver denial, replay denial, immediate suspended and
archived stale-token denial, Storage denial, and zero tagged/Auth residue.

The owner completed the current five-client manual identity matrix on
2026-07-21, including customer verification, staff invitation/password setup,
role and inactive-state boundaries, session behavior, and both Expo Go apps.
Redacted screenshots are stored under
`docs/live-test-data-docs/images/phase2-images/`; terminal validation and live
Firebase results are stored in
`docs/live-test-data-docs/terminal-data/terminal-data-phase-2`.
