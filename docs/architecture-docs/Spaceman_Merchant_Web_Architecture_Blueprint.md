# Merchant Web Architecture & Store Operations Blueprint

<!-- Source page 1 -->

**Project:** SPACEMAN PROJECTS

Detailed UI/UX components, order handling, store scope, catalog ownership, settlements, security, data contracts and monorepo implementation flow.

**Channels:** MERCHANT WEB | ADMIN WEB | CUSTOMER | DRIVER | FIREBASE

## Architecture principles

1. **Merchant scope is store-bound** — Every read and write is limited to assigned approved store IDs.
2. **Paid orders drive fulfillment** — Merchant fulfillment begins only after trusted payment confirmation.
3. **Order transitions are commands** — Confirm, prepare, ready and rejection are server-validated.
4. **Catalog edits preserve history** — Mutable menus never rewrite item snapshots in historical orders.
5. **Admin remains the control plane** — Approvals, refunds, role changes and exceptional overrides remain audited.

## Document scope

1. **Role experience** — Screens, commands, states and UX
2. **Workflow ownership** — Who reads, writes, approves and resolves
3. **Data contracts** — Canonical records, snapshots and enums
4. **Security boundaries** — Rules, Functions, App Check and audit
5. **Monorepo flow** — Shared packages without forced UI reuse
6. **Development plan** — Phases, tests, deployment and Codex prompts

**Version:** VERSION 1.0 - JULY 2026

Prepared as a stable visual reference for Codex prompts and implementation reviews.

> **Source footer:** SPACEMAN PROJECTS - ARCHITECTURE Implementation reference for Codex / VS Code 1 | 1

## Source-file metadata

| Field | Value |
| --- | --- |
| Source file | Spaceman_Merchant_Web_Architecture_Blueprint.pdf |
| Format | PDF |
| PDF page count | 18 |
| Creator | Impress |
| Producer | LibreOffice 25.2.3.2 (X86_64) / LibreOffice Community |
| Creation date | D:20260715143139Z' |

## Page 2: Merchant Web Role in the Five-App System

<!-- Source page 2 -->

**Source section:** SYSTEM CONTEXT

The merchant experience operates one or more approved stores without becoming a second source of platform truth.

### 1. Merchant experience

1. **Dashboard** — Store health, queues and SLA
2. **Orders** — Confirm, prepare, ready, reject
3. **Catalog** — Items, availability and pricing
4. **Store** — Hours, open state and profile
5. **Finance** — Read-only order and settlement views

### 2. Shared domain layer

1. **types/** — Canonical order and store enums
2. **schemas/** — Command payload validation
3. **services/** — Orders, catalog and store adapters
4. **notifications/** — Event-to-message mapping
5. **utils/** — Status and money helpers

### 3. Backend services

1. **Firebase Auth** — Identity and merchant claim
2. **Firestore** — Store, items and order truth
3. **Cloud Functions** — Transitions and privileged commands
4. **Storage** — Store and item media
5. **FCM / Email** — New order and exception alerts

### 4. Cross-app effects

1. **Customer** — Sees availability and order status
2. **Driver** — Sees pickup readiness
3. **Admin** — Monitors SLA and exceptions
4. **Paystack** — Payment truth remains external
5. **Maps** — Pickup geocode and ETA context

> **Boundary rule**
>
> Merchant Web may manage only approved store scope. It cannot create arbitrary roles, mark a payment paid, assign drivers, process refunds or bypass the canonical order transition matrix.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 2 | 2

## Page 3: Merchant Web Shell and Component System

<!-- Source page 3 -->

**Source section:** UI / UX ARCHITECTURE

Desktop-first store operations UI with fast queue handling, visible SLA context and safe action confirmation.

### 1. Page anatomy and navigation

1. **Primary navigation** — •Dashboard •Orders •Catalog •Store profile •Finance •Support / Activity
2. **Header controls** — •Store selector when multi-store •Open / closed indicator •Notification center •Account and logout
3. **Operational surface** — •KPI cards •Queue tabs •Search and filters •Order rows / cards •Context drawer

### 2. Reusable UX components

1. **Status chips** — Paid, New, Confirmed, Preparing, Ready, Rejected, Cancelled and issue labels combine text with semantic color.
2. **Command controls** — Confirm, Start preparing, Mark ready and Cannot fulfill are disabled while pending and require valid current state.
3. **Feedback states** — Skeleton, empty queue, offline banner, retry, inline validation, toast and full error details for operational failures.
4. **Responsive behavior** — On narrow screens, collapse navigation, stack KPIs and render orders as cards. Avoid admin-style wide tables on phones.

> **Accessibility baseline**
>
> Keyboard navigation, visible focus, 44 px targets, descriptive labels, non-color status text and confirmation for destructive or customer-impacting actions.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 3 | 3

## Page 4: Merchant Identity, Store Assignment and Approval

<!-- Source page 4 -->

**Source section:** IDENTITY & ONBOARDING

Merchant access begins with an admin-controlled invitation and a precise store scope.

### 1. Onboarding command flow

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Invite | Admin enters merchant email and store |
| 2 | Authenticate | User signs in or completes account |
| 3 | Claim + scope | Backend applies merchant role and storeIds |
| 4 | Profile | Merchant completes contact details |
| 5 | Review | Admin confirms onboarding state |
| 6 | Activate | Merchant routes and store data unlock |

### 2. State and capability matrix

| State | Can sign in | Can read store | Can update orders | Can edit catalog | Admin action |
| --- | --- | --- | --- | --- | --- |
| invited | Limited | No | No | No | Resend / revoke |
| pending_profile | Yes | Read-only | No | No | Review profile |
| pending_approval | Yes | Read-only | No | Draft only | Approve / reject |
| active | Yes | Scoped | Allowed transitions | Scoped | Suspend / change scope |
| suspended | Blocked or read-only | No operational reads | No | No | Unsuspend |
| archived | No | Historical retained | No | No | Retention workflow |

> **Claim consistency**
>
> Role claims and users/{uid}.storeScope must be updated through a privileged backend command and audited together. The UI must fail closed if they disagree.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 4 | 4

## Page 5: Store Operations Dashboard

<!-- Source page 5 -->

**Source section:** MERCHANT MODULE - DASHBOARD

A focused overview that answers: what needs attention now, what is late and whether the store can accept orders.

### 1. Operational KPIs

1. **New paid orders** — Orders awaiting merchant confirmation; click filters the queue.
2. **Preparing** — Confirmed orders currently in production.
3. **Ready for pickup** — Orders ready and waiting for a driver.
4. **SLA breaches** — Confirmation or preparation timers beyond thresholds.

### 2. Store state

1. **Open for orders** — Explicit operational toggle separate from published active state.
2. **Opening hours** — Current schedule, next closing time and temporary closure reason.
3. **Catalog health** — Available items, unavailable items and missing-image or invalid-price warnings.
4. **Integration status** — Realtime connection, notification permission and last successful sync.

### 3. Attention feed

- **! Merchant not responding** — Escalation countdown and direct link to affected order.
- **! Driver waiting** — Ready order has an assigned driver at pickup location.
- **! Customer or admin note** — Unresolved issue requiring merchant response.
- **! Store or item approval** — Admin decision or requested correction.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 5 | 5

## Page 6: Incoming Paid Order Queue and Confirmation

<!-- Source page 6 -->

**Source section:** MERCHANT MODULE - ORDERS

The merchant receives only orders whose payment state permits fulfillment.

### 1. Order intake flow

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Payment verified | Paystack webhook / verify sets paid |
| 2 | Order appears | Scoped realtime query by storeId |
| 3 | Merchant reviews | Items, modifiers, notes, totals |
| 4 | Confirm or reject | Validated command with reason |
| 5 | Notify channels | Customer, admin and driver logic update |

### 2. Queue contract

| Field / control | Purpose | Source of truth | Failure handling |
| --- | --- | --- | --- |
| Order ID + timer | Identity and confirmation SLA | order + status timestamp | Highlight and create activity |
| Customer snapshot | Name / contact policy | order snapshot | Do not query mutable profile for history |
| Item snapshots | Production instructions | order.items[] | Cannot be edited after payment |
| Payment chip | Paid / failed / refund state | provider-confirmed order.payment | Merchant cannot change |
| Confirm | Move paid -> confirmed | Cloud Function command | Disable while pending; refresh canonical order |
| Cannot fulfill | Reject with code / note | Cloud Function command | Creates cancellation/refund workflow |

> **Critical invariant**
>
> A merchant UI callback, local cache or user claim cannot establish payment truth. Only verified provider data can allow fulfillment to begin.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 6 | 6

## Page 7: Preparing, Ready and Pickup Handoff

<!-- Source page 7 -->

**Source section:** MERCHANT MODULE - FULFILLMENT

Preparation state changes are explicit, timestamped and visible to every app.

### 1. Fulfillment progression

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Confirmed | Merchant accepted order |
| 2 | Preparing | Kitchen / store starts work |
| 3 | Ready for pickup | Packed and handoff-ready |
| 4 | Driver arrives | Assignment and proximity visible |
| 5 | Handoff | Driver confirms pickup |
| 6 | On the way | Merchant order moves out of active production |

### 2. State ownership and UI behavior

| Current state | Merchant action | Required validation | Writes | Customer / driver effect |
| --- | --- | --- | --- | --- |
| confirmed | Start preparing | paid, same store, not cancelled | status + preparingAt | Customer sees preparing |
| preparing | Mark ready | active order, items fulfilled | status + readyAt | Driver receives pickup-ready alert |
| ready | Wait / report issue | No merchant jump to delivered | issue/activity only | Driver performs pickup |
| driver_assigned | Continue preparation | Assignment does not change merchant state | read only assignment | Shows driver identity / ETA |
| on_the_way | Archive from active queue | Driver pickup command verified | none | Customer tracking continues |
| cancelled | Acknowledge / add note | No further fulfillment | activity note only | Refund path managed elsewhere |

> **Timestamp rule**
>
> Waiting time and SLA are derived from server timestamps. Never use a browser timer as the authoritative value.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 7 | 7

## Page 8: Rejection, Cannot-Fulfill and Issue Resolution

<!-- Source page 8 -->

**Source section:** MERCHANT MODULE - EXCEPTIONS

Merchant exceptions provide structured facts; admin and payment services own financial consequences.

### 1. Merchant-originated exceptions

1. **OUT_OF_STOCK** — One or more paid item snapshots cannot be fulfilled. Include affected item IDs and optional substitute note.
2. **STORE_CLOSED** — Store cannot fulfill despite published state. Close ordering and supply a reason.
3. **CAPACITY_LIMIT** — Unexpected operational overload; provide expected recovery time.
4. **ORDER_DETAIL_PROBLEM** — Ambiguous modifier, customer note or impossible request; route for support review.

### 2. Resolution ownership

| Issue | Merchant | Admin / system | Payment |
| --- | --- | --- | --- |
| Cannot fulfill | Reason + evidence | Cancel / resolve | Refund if captured |
| Partial item issue | Propose correction | Approve customer-safe resolution | Adjustment only<br>through backend |
| Driver late | Keep order ready; report | Contact / reassign | No direct effect |
| Customer unreachable | Report attempt | Support intervention | No direct effect |
| Duplicate order<br>suspicion | Pause and report | Investigate idempotency | Verify references |
| Integration failure | Retry / offline fallback | Activity + function logs | Reconcile event |

> **Refund boundary**
>
> Merchant Web never calls Paystack refund APIs and never writes paymentStatus/refundStatus directly. It only submits a fulfillment exception command.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 8 | 8

## Page 9: Scoped Catalog and Availability Management

<!-- Source page 9 -->

**Source section:** MERCHANT MODULE - CATALOG

Merchant edits accelerate daily operations while preserving admin governance and historical order snapshots.

### 1. Allowed merchant edits

1. **Availability** — Toggle item available / unavailable with optional until time.
2. **Price proposal** — Edit directly only if policy permits; otherwise create approval request.
3. **Description / image** — Update presentation fields with validation and Storage upload.
4. **Sort and category** — Organize own-store catalog without moving items across stores.

### 2. Validation gate

1. **Store target lock** — item.storeId is immutable from Merchant Web.
2. **Price and currency** — Numeric, non-negative, ZAR; server normalizes money units.
3. **Media safety** — Type/size checks, compression, stable Storage URL and orphan cleanup.
4. **Audit metadata** — actorUid, old/new values, source=merchant and timestamp.

### 3. Publish behavior

1. **Immediate low-risk edits** — Availability and sort order update after validation.
2. **Approval-required edits** — Configurable for price, store identity or regulated fields.
3. **Customer cache invalidation** — Invalidate scoped catalog queries after accepted write.
4. **Historical integrity** — Existing order item snapshots never recalculate.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 9 | 9

## Page 10: Store Profile, Hours and Ordering Availability

<!-- Source page 10 -->

**Source section:** MERCHANT MODULE - STORE

Published identity, operational availability and temporary closure are separate states.

### 1. Store profile contract

1. **Identity** — Name, category, description, source and admin approval state.
2. **Location** — Address, placeId / Plus Code, GeoPoint and validated pickup entrance.
3. **Operations** — Opening schedule, special hours, openForOrders and prep-time estimate.
4. **Commerce** — Minimum order, fee-rule references and customer review visibility.
5. **Media** — Card and hero images with attribution metadata.

### 2. State model and effects

| State | Customer visibility | Can receive orders | Who changes |
| --- | --- | --- | --- |
| pending | No / preview only | No | Admin approval |
| active + open | Yes | Yes | Admin activates; merchant<br>opens |
| active + closed | Yes, closed | No | Schedule / merchant<br>temporary toggle |
| inactive | No ordering | No | Admin |
| suspended | No operational access | No | Admin / Super Admin |
| archived | Historical reference only | No | Privileged command |

> **Availability consistency**
>
> Checkout revalidates active, openForOrders, item availability, hours and fee rule. Customer catalog display alone is not an authorization to place the order.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 10 | 10

## Page 11: Order Ledger, Commission and Settlement Views

<!-- Source page 11 -->

**Source section:** MERCHANT MODULE - FINANCE

Merchant finance screens explain platform deductions but never become the accounting source of truth.

### 1. Per-order financial snapshot

1. **Customer subtotal** — Sum of immutable item snapshots and modifiers.
2. **Store commission** — Versioned percentage / fixed rule captured at order time.
3. **Delivery and service fees** — Displayed separately; ownership follows platform policy.
4. **Refund / adjustment** — Provider-confirmed events and audited administrative reasons.
5. **Net store amount** — Derived from the captured financial snapshot, not current settings.

### 2. Settlement data contract

| Field | Meaning | Write authority |
| --- | --- | --- |
| orderId / paymentReference | Traceability to canonical order and provider transaction | System |
| grossAmount | Captured customer amount | Paystack verification |
| commissionSnapshot | Rule/version used for this order | Backend pricing service |
| refundAmount | Confirmed provider refund | Webhook / reconciliation |
| netMerchantAmount | Derived settlement basis | Backend ledger |
| settlementStatus | unsettled / scheduled / paid / disputed | Finance backend / admin |
| settledAt / reference | Payout proof when implemented | Backend |

> **V1 decision**
>
> If automated merchant payouts are not implemented, present a read-only ledger and manual reconciliation status. Do not imply that a payout occurred without a trusted payout reference.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 11 | 11

## Page 12: Operational Alerts, Timers and Offline Behavior

<!-- Source page 12 -->

**Source section:** NOTIFICATIONS & SLA

Alerts are event-driven and deduplicated; dashboard timers are derived from server time.

### 1. Merchant notifications

1. **New paid order** — High-priority push/browser notification with order link.
2. **Confirmation SLA warning** — Escalates before MERCHANT_NOT_RESPONDING threshold.
3. **Driver arrival / waiting** — Ready order and assigned driver proximity context.
4. **Admin or support update** — Resolution, suspension or requested store correction.

### 2. Delivery guarantees

1. **Event idempotency** — One logical event creates one notification per recipient/channel.
2. **Read state** — notifications/{id} tracks recipient, event, readAt and deep link.
3. **Escalation activity** — Final delivery failure becomes an admin activity, not a silent drop.
4. **Quiet duplication control** — Web and push channels share an event key.

### 3. Offline UX

1. **Connection banner** — Clearly show disconnected / reconnecting state.
2. **No false success** — Commands remain pending until canonical response arrives.
3. **Refresh after resume** — Requery active orders and invalidate stale cache.
4. **Optional printer / sound** — Treat as secondary alert; never depend on it for data state.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 12 | 12

## Page 13: Merchant Read/Write Contract

<!-- Source page 13 -->

**Source section:** DATA ARCHITECTURE

Merchant Web reads a scoped operational projection and submits commands; it does not directly own canonical truth.

### 1. Readable data

| Path / projection | Merchant scope | Purpose |
| --- | --- | --- |
| users/{uid} | self | profile, role and storeScope |
| stores/{storeId} | assigned storeIds | identity, hours, operational state |
| items/{itemId} | where storeId in scope | catalog and availability |
| orders/{orderId} | storeId in scope | fulfillment queue and history |
| notifications/{id} | recipientUid=self | alerts and read state |
| activities/{id} | related store + permitted<br>types | support / issue status |
| settlements or ledger<br>projection | assigned storeIds | read-only financial view |

### 2. Command writes

1. **merchantConfirmOrder** — Validates actor, store scope, payment state and current status; writes confirmedAt and history.
2. **merchantStartPreparing** — Allowed only from confirmed; server timestamp and audit.
3. **merchantMarkReady** — Allowed only from preparing; emits driver/customer notifications.
4. **merchantRejectOrder** — Structured reason; creates cancellation/refund workflow.
5. **merchantUpdateCatalog / Store** — Schema-validated, scoped and audited updates.

> **Snapshot principle**
>
> Orders store customer, store and item display snapshots. Merchant profile or catalog edits affect future reads and orders, not the meaning of an existing transaction.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 13 | 13

## Page 14: Merchant Security and Privileged Boundaries

<!-- Source page 14 -->

**Source section:** SECURITY ARCHITECTURE

Route guards improve UX; Firebase rules and server commands enforce store ownership.

### 1. Client defenses

1. **Auth route guard** — Require authenticated merchant role and active status.
2. **Capability guard** — Hide actions outside current state or policy.
3. **Schema validation** — Validate forms and command payloads before sending.
4. **App Check** — Attach valid attestation where supported; do not treat it as user authorization.

### 2. Backend enforcement

1. **Deny by default** — Firestore rules verify role, active status and store membership.
2. **Immutable fields** — Merchant cannot alter payment, customer IDs, storeId or protected status fields.
3. **Functions** — Order transitions, role changes, refunds and destructive actions run server-side.
4. **Audit logs** — Actor, resource, before/after, command ID and result are immutable.

### 3. Threats to test

1. **Cross-store query** — Merchant attempts another storeId.
2. **Status jump** — Direct ready/delivered write or stale command replay.
3. **Payment tampering** — Client tries to mark paid or alter total.
4. **Suspended session** — Existing token attempts continued reads/writes.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 14 | 14

## Page 15: Merchant Web Monorepo Boundaries

<!-- Source page 15 -->

**Source section:** CODEBASE ARCHITECTURE

Merchant Web uses web-native UI while importing shared domain contracts and Firebase adapters.

### 1. Application layer

1. **routes/** — dashboard, orders, catalog, store, finance
2. **components/** — merchant-specific cards, tables, drawers
3. **features/** — bounded order/catalog/store modules
4. **state/** — query cache and minimal UI state
5. **adapters/** — browser notifications and uploads

### 2. Shared packages

1. **types/** — Order, Store, Item, Money
2. **schemas/** — merchant command payloads
3. **services/** — typed Firestore and Functions clients
4. **notifications/** — event mapping
5. **utils/** — formatting and status helpers

### 3. Firebase workspace

1. **functions/** — order commands and notifications
2. **firestore.rules** — role/store scope enforcement
3. **firestore.indexe s** — store queue queries
4. **storage.rules** — scoped media uploads
5. **emulators/** — integration verification

### 4. Dependency rule

1. **merchant-web -> shared** — allowed
2. **shared -> app** — forbidden
3. **app -> app** — forbidden
4. **UI sharing to Expo** — avoid
5. **one Firebase project** — non-negotiable

> **Suggested route structure**
>
> apps/merchant-web/src/{routes,features,components,providers}; packages/shared/{firebase,types,schemas,services,notifications,utils}. Confirm actual repo paths before moving files.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 15 | 15

## Page 16: Performance, Reliability and Test Matrix

<!-- Source page 16 -->

**Source section:** ENGINEERING QUALITY

Operational correctness is prioritized over decorative complexity.

### 1. Performance

1. **Scoped listeners** — One active order query per visible store/view; unsubscribe on route change.
2. **Pagination** — Server-backed history and catalog lists; bounded date ranges.
3. **Media** — Compressed images, thumbnails and lazy loading.
4. **Code splitting** — Lazy-load finance, settings and heavy editors.

### 2. Reliability

1. **Idempotent commands** — Stable command IDs protect confirm/reject/ready retries.
2. **Transactions** — Couple status, history, activity and notification outbox safely.
3. **Canonical refresh** — Replace optimistic operational state with returned order.
4. **Failure visibility** — Provider/function failures create an activity and actionable error.

### 3. Verification

1. **Unit** — Schemas, transition matrix, money and SLA helpers.
2. **Emulator** — Firestore rules, Functions and multi-role scope tests.
3. **Web E2E** — Invite, order confirmation, ready, reject, catalog and offline resume.
4. **Release gate** — Typecheck, lint, build, rules/index validation and manual smoke.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 16 | 16

## Page 17: Merchant Web Development Roadmap

<!-- Source page 17 -->

**Source section:** IMPLEMENTATION OPERATING MODEL

Implement in bounded phases that preserve the shared backend and current working apps.

### 1. Phased build sequence

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Inspect | Repo, routes, schema, rules and current behavior |
| 2 | Shell + auth | Role guard, store scope and navigation |
| 3 | Order queue | Paid intake, detail and confirm |
| 4 | Fulfillment | Preparing, ready and notifications |
| 5 | Catalog / store | Scoped edits and availability |
| 6 | Finance / quality | Ledger, tests, observability and release |

### 2. Phase exit criteria

| Phase | Exit criteria | High-risk checks |
| --- | --- | --- |
| 1. Discovery | Exact files, paths, indexes, Functions and data names documented | No assumptions overwrite deployed truth |
| 2. Identity | Merchant can sign in only to assigned approved stores | Cross-store reads/writes denied |
| 3. Orders | Paid orders display and confirm exactly once | No client payment truth; stale command rejected |
| 4. Fulfillment | Preparing/ready visible to customer, driver and admin | Allowed transitions and server timestamps |
| 5. Catalog/store | Scoped edits, validation, cache invalidation and audit | Historical snapshots unchanged |
| 6. Finance/release | Ledger reconciles; tests/build/rules pass | No unverified payout or refund claims |

> **Reusable Codex instruction**
>
> Resume current progress. Inspect merchant-web and shared backend first; list exact files/data paths; implement one bounded feature; preserve one Firebase project; run targeted tests, typecheck/lint/build; report every change and deployment impact.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 17 | 17

## Page 18: Merchant Web Traceability and Decisions

<!-- Source page 18 -->

**Source section:** REFERENCE CONTROL

Traceability, current decisions and implementation assumptions.

### 1. Source-to-module traceability

| Source | Captured architecture detail | Used in this document |
| --- | --- | --- |
| Admin blueprint - system context | Five apps, shared packages, one Firebase backend | Pages 2, 13, 15 |
| Admin blueprint - order lifecycle | Merchant owns confirm, prepare, ready and rejection | Pages 6-8 |
| Admin blueprint - canonical order | Order/payment/delivery snapshots and provider enrichment | Pages 6-13 |
| Admin blueprint - stores/items | Manual/admin workflows and scoped catalog governance | Pages 9-10 |
| Admin blueprint - security | Roles, store scope, Functions, audit and denial by default | Pages 4, 13-16 |
| Current project observations | Merchant role exists in the shared five-app workflow | All module assumptions |
| Official provider guidance | Backend payment initialization, verification and signed webhook handling | Payment boundaries |

### 2. Normalized decisions

- **One backend** — Merchant Web uses the existing Firebase project and collections.
- **Store scope** — Merchant access is limited to assigned approved store IDs.
- **Payment truth** — Paystack verification/webhooks, not UI callbacks, authorize fulfillment.
- **Refunds** — Merchant raises exceptions; admin/backend controls refund commands.
- **UI stack** — React web remains web-native; shared code is domain logic, not mobile UI.
- **V1 finance** — Read-only ledger unless trusted payout automation exists.
- **Source precedence** — Current repo/deployment > approved architecture > mockup intent.

> **Document status**
>
> Architecture synthesis for implementation. Before changing code, validate exact collection names, existing Cloud Functions, deployed rules, current routes and environment variables against the monorepo.

> **Source footer:** SPACEMAN PROJECTS - MERCHANT WEB - ARCHITECTURE Implementation reference for Codex / VS Code 18 | 18
