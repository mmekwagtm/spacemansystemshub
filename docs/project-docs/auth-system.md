# Auth System

## Current implementation state

All five apps use shared identity contracts, the Firebase gateway, and identity
services against the `spacemansystemsbackend` development project. Customer Web
and Customer App support guest browsing, registration, sign-in, verification,
resend, session restoration, claims refresh, and sign-out. Admin Web, Merchant
Web, and Driver App support invitation/password setup, session restoration,
role/status denial, claims refresh, and sign-out.

The six Phase 2 callable Functions are deployed in `africa-south1`:
`registerCustomerProfile`, `syncMyClaims`, `createStaffUser`,
`updateUserStatus`, `updateUserScope`, and `healthcheck`.

## Roles and status

Canonical roles are `customer`, `merchant`, `driver`, `admin`, and
`super_admin`. User status is separate: `invited`, `pending_profile`,
`pending_approval`, `active`, `suspended`, or `archived`.

`super_admin` alone can manage administrator roles and critical platform
settings. Merchant scope is limited to assigned store IDs, drivers to their
assignment, and customers to their own records.

Allowed status transitions are canonical and replay-safe:

- `invited` may advance through onboarding, become active, or be suspended or
  archived.
- `pending_profile` and `pending_approval` may advance, be suspended, or be
  archived.
- `active` may become suspended or archived.
- `suspended` may be reactivated or archived.
- `archived` is terminal; changing to the current status is also rejected.

## User profile contract

`users/{uid}` contains the canonical role, status, profile fields,
role-specific scope, schema version, and server timestamps. Custom claims are a
coarse mirror of role/status/scope and are changed only by trusted Functions.
Protected Rules and Functions also read the canonical profile, preventing an
already-issued token from bypassing suspension or archive.

Customer profile fields will become self-editable only through a later
allowlisted trusted command. Role, status, scope, claims, financial fields, and
audit data remain protected from all direct clients.

## Flows

- Customers self-register with Firebase email/password. The server derives UID
  and email from Firebase Auth, creates the active customer profile, and sets
  claims. Unverified customers may read only their own profile and cannot use
  protected platform Functions.
- Super-admins create Merchant, Driver, and Admin identities through the
  trusted Function. Staff use Firebase password-reset email as their setup
  link; staff cannot self-assign roles, status, or scope.
- Route guards improve UX, but Rules and Functions enforce authorization.
- Archive/redact disables sign-in and clears disposable data while preserving
  required order, payment, and audit history.

## Security and validation

Rules deny cross-user, cross-store, and cross-driver access. Functions
revalidate canonical role, status, scope, target resource, and allowed state on
every sensitive command. App Check is a planned additional abuse-control
layer, not a substitute for authentication or ownership checks.

The 2026-07-21 development live matrix verified customer bootstrap and email
verification, trusted staff invitation/scope/activation, replay denial,
protected-field denial, cross-user/store/driver denial, immediate suspended and
archived stale-token denial in both Functions and Rules, Storage denial, and
exact fixture cleanup. Human cross-app sign-in and Expo Go acceptance remains
listed in `live-test-steps.md`.
