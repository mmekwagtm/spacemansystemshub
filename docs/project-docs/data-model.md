# Canonical Data Model

## Root collections

| Collection                                        | Primary responsibility                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `users`                                           | Profile, canonical role/status, and role-specific scope.                            |
| `stores` / `items`                                | Marketplace identity, availability, and mutable catalog.                            |
| `orders`                                          | Verified-payment transaction snapshot and operational fulfillment truth.            |
| `checkoutSessions`                                | Expiring quotes, quote inputs, idempotency, and provider references before payment. |
| `paymentEvents`                                   | Signed Paystack evidence and idempotency history.                                   |
| `orderEvents`                                     | Append-only lifecycle/history evidence.                                             |
| `driverAssignments` / `driverLocations`           | Assignment projection/version and active-delivery location projection.              |
| `notifications` / `notificationOutbox`            | Recipient-facing records and reliable delivery intent.                              |
| `activities` / `auditLogs`                        | Human work queue and immutable privileged-command evidence.                         |
| `feeRules` / `deliveryZones` / `platformSettings` | Versioned Mabopane pricing, serviceability, and configuration.                      |
| `importBatches` / `settlements`                   | Reviewed catalog imports and financial settlement projection.                       |

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

## Phase 3 marketplace contract

`stores/{storeId}` carries category, description, normalized `searchName`,
source metadata, approval state, operating hours, `openForOrders`, minimum
order in integer ZAR minor units, and card/hero media. Operational status
(`draft`, `active`, `suspended`, or `archived`) is separate from review state
(`pending`, `approved`, or `rejected`). A public store must be both `active`
and `approved`.

`items/{itemId}` carries immutable `storeId`, normalized `searchName`, category
label, integer-minor-unit price, status, availability, sort order, source/import
metadata, image alt text, and media. Public item reads require an `active` item
and an active/approved parent store; an active but temporarily unavailable item
remains visible with its unavailable state.

`importBatches/{batchId}` records the requested source, target store, actor,
content hash, row counts, selection, result, status, timestamps, and optional
`testRunId`. Normalized review rows live in
`importBatches/{batchId}/rows/{rowId}`. Imports stage and preview before a
selected, idempotent commit; no provider response publishes directly.

Catalog media uses private staging paths below
`catalog-staging/{uid}/{testRunId-or-session}/...` and active published paths
below `catalog/{storeId}/...`. JPEG, PNG, and WebP are accepted within bounded
sizes. Published records carry original/thumbnail metadata; cleanup names the
exact object paths and never scans or deletes another actor's prefix.

All marketplace document writes are trusted Function commands. Admin governs
approval, ownership, protected location/scope, status, and retirement. A
canonical pending merchant may create only their own draft onboarding record;
an active merchant may update only explicitly permitted fields for an assigned
store.

## Phase 4 checkout contract

`deliveryZones/{zoneId}` defines an active ZA locality allowlist,
`serviceAreaVersion`, and `activeFeeRuleId`. `feeRules/{feeRuleId}` is an
immutable version containing the base fee, included metres, per-kilometre
charge, small-order threshold/surcharge, minimum/maximum clamp, effective
timestamp, and supersession reference.

`platformSettings/default` holds independent
`customerOrderingEnabled`, `mapsQuoteEnabled`, and `paystackEnabled` switches.
Only a super administrator may change those switches. New payment
initialization fails closed until all required flags and delivery configuration
are valid.

`checkoutSessions/{checkoutId}` uses schema version `1` and stores the customer
channel, request hash, idempotency key, authoritative lines, immutable store,
address, route, and fee-rule snapshots, ten-minute expiry, Paystack reference,
status, and resulting order ID. A deterministic customer/idempotency-key pair
maps to one checkout ID; reusing the key with different input is rejected.

Verified payment creates `orders/{checkoutId}` exactly once in the same
transaction that records payment/order/audit evidence, merchant notification
intent, and checkout consumption. The order uses the quote snapshots rather
than mutable catalog records. Failed, abandoned, mismatched, or still-pending
payment evidence never creates an order.
