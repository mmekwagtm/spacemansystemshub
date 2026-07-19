# Architecture Decisions

## AD-001: Greenfield canonical workspace

`spacemansystems` is the new canonical repository. Architecture source material
is retained, while operational project documentation records the choices needed
to implement it. No existing Firebase, EAS, source-code, or deployment identity
is assumed.

## AD-002: One real development Firebase project

All five apps share one real Firebase development project. Firebase emulators
are not used. Production remains separately gated and unconfigured until the
release-readiness phase.

## AD-003: Package and application boundaries

Use pnpm, Vite React TypeScript web applications, Expo Router native
applications, and the `@spaceman/app-*` package layout documented in
`AGENTS.md`. Apps never import another app or call Firebase directly.

## AD-004: Identity and privileged authority

Use email/password customer auth, invite-based staff accounts, and distinct
`super_admin` authority. Role, user status, scope, claims, and trusted writes
are server-managed and audited.

## AD-005: Verified payment creates an order

`checkoutSessions` owns expiring pre-payment quotes. A verified Paystack event
atomically creates exactly one `orders/{orderId}` record and associated payment
event/audit/outbox records. Failed payments remain checkout/payment evidence,
not fulfillment orders.

## AD-006: Composed order state

Payment, fulfillment, assignment, and needs-action data are separate contracts.
This prevents driver assignment from conflicting with preparation and treats
`NO_DRIVER_ASSIGNED` as a derived action reason rather than an order status.

## AD-007: Development-test isolation

Automated development-project fixtures use `testRunId`; only a privileged,
audited cleanup command may remove that run's tagged records.

## AD-008: V1 safety boundaries

Maps failures block payment; notifications are in-app plus native FCM; Driver
App location is foreground-only during active delivery; no media proof is
collected in V1.
