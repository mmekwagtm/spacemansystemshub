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

## AD-009: Manual validation and release control

Repository-hosted automation workflows are not part of this project. The
project owner runs the documented validation, Playwright, Expo Go, Maestro,
Firebase integration, and release-acceptance steps manually, reviews the
resulting diff, and creates commits manually. Production deployment remains
blocked until the complete Phase 7 acceptance matrix is reviewed and approved.

## AD-010: Canonical identity checks and callable ingress

Development Functions and Firebase data are co-located in `africa-south1`.
Every protected Function and Rule checks the canonical `users/{uid}` role and
status in addition to token claims, so suspension or archive takes effect for
already-issued tokens. Cloud Run's invoker IAM check is disabled only for the
six HTTPS callable identity services; Firebase callable authentication and the
server-side role/status/scope checks remain authoritative.

## AD-011: Staged App Check rollout

App Check enforcement remains off for all five development clients during
Phase 2 manual acceptance. Web reCAPTCHA providers and native attestation are
not yet registered, and Expo Go cannot provide the production Android
attestation path. Enforcement may be staged only after provider registration,
development-build/debug-token verification, metrics observation, and a tested
rollback avoid locking out a client. Authentication, Rules, and Function
authorization remain mandatory with or without App Check.
