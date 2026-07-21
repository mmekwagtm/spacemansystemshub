# Canonical Data Model

## Root collections

| Collection | Primary responsibility |
| --- | --- |
| `users` | Profile, canonical role/status, and role-specific scope. |
| `stores` / `items` | Marketplace identity, availability, and mutable catalog. |
| `orders` | Verified-payment transaction snapshot and operational fulfillment truth. |
| `checkoutSessions` | Expiring quotes, quote inputs, idempotency, and provider references before payment. |
| `paymentEvents` | Signed Paystack evidence and idempotency history. |
| `orderEvents` | Append-only lifecycle/history evidence. |
| `driverAssignments` / `driverLocations` | Assignment projection/version and active-delivery location projection. |
| `notifications` / `notificationOutbox` | Recipient-facing records and reliable delivery intent. |
| `activities` / `auditLogs` | Human work queue and immutable privileged-command evidence. |
| `feeRules` / `deliveryZones` / `platformSettings` | Versioned Mabopane pricing, serviceability, and configuration. |
| `importBatches` / `settlements` | Reviewed catalog imports and financial settlement projection. |

## Order contract

`orders/{orderId}` is created only after verified payment. It contains immutable
customer, store, item, address, and pricing snapshots plus four independent
state groups:

- `payment`: paid/refund state and provider references.
- `fulfillment`: paid, confirmed, preparing, ready_for_pickup, on_the_way,
  delivered, cancelled, or approved terminal refund outcome.
- `assignment`: driver, independent assignment status, version, and timestamps.
- `needsAction`: derived reason codes and their last update time.

Money uses integer minor units and server timestamps are authoritative. Every
mutable source-model document carries `createdAt`, `createdBy`, `updatedAt`,
and `updatedBy`; disposable development records additionally carry
`testRunId`. Identity profiles use `schemaVersion: 1`; other collections must
not assume a schema version until their owning phase defines one.

## Ownership

Customers own their own profile, addresses, cart state, orders, and
notifications. Merchants are limited to assigned stores. Drivers are limited to
assigned/eligible delivery projections. Admin access is explicit and audited;
`super_admin` controls critical role and platform-setting changes. Payment,
refund, role, assignment, and protected lifecycle fields are Function-only.

## Identity projection

`users/{uid}` is canonical for email, role, status, scope, profile fields, and
identity audit metadata. Firebase custom claims mirror role, status,
`storeIds`, `deliveryZoneIds`, and `regionIds` for coarse routing, but a stale
claim never overrides the canonical profile. Customer profiles are created by
`registerCustomerProfile`; staff profiles are created by `createStaffUser`.
Clients have no direct write access to `users`.
