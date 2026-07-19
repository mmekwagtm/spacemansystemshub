# Auth System

## Current implementation state

The source baseline contains shared auth guards plus trusted Functions for
staff provisioning, user status/scope changes, and archive/redact requests.
They are not connected to a configured Firebase project, email invitation
provider, App Check policy, or live customer authentication UI.

## Roles and status

Canonical roles are `customer`, `merchant`, `driver`, `admin`, and
`super_admin`. User status is separate: `invited`, `pending_profile`,
`pending_approval`, `active`, `suspended`, or `archived`.

`super_admin` alone can manage administrator roles and critical platform
settings. Merchant scope is limited to assigned store IDs, drivers to their
assignment, and customers to their own records.

## User profile contract

`users/{uid}` contains the canonical role, status, profile fields,
role-specific scope, schema version, and server timestamps. Custom claims are
a coarse mirror of role/status and are changed only by trusted Functions.

Customer profile fields are self-editable only through an allowlist. Role,
status, scope, claims, financial fields, and audit data are protected.

## Flows

- Customers will self-register and sign in with Firebase email/password once
  development Firebase configuration is available.
- Super-admins can create Merchant, Driver, and Admin identities through the
  trusted source command; outbound invitation delivery remains unconfigured,
  and staff cannot self-assign roles.
- Route guards improve UX, but Rules and Functions enforce authorization.
- Archive/redact disables sign-in and clears disposable data while preserving
  required order, payment, and audit history.

## Security and validation

Rules deny cross-user, cross-store, and cross-driver access. Functions
revalidate role, status, scope, target resource, and allowed state on every
sensitive command. App Check is a planned additional abuse-control layer, not
a substitute for authentication or ownership checks.
