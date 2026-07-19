# Spaceman Projects Five-App Ecosystem Master Plan

<!-- Source page 1 -->

**Project:** SPACEMAN PROJECTS

The authoritative development blueprint for Admin Web, Merchant Web, Customer Web, Customer App and Driver App - including Firebase, Google Cloud / Maps, Paystack, security, data, deployment and start-to-end delivery phases.

**Channels:** ADMIN WEB | MERCHANT WEB | CUSTOMER | DRIVER APP | BACKEND

## Architecture principles

1. **One canonical platform** — All channels operate on one Firebase project and one shared domain model.
2. **Orders are the central transaction** — Every app observes or advances the same validated order lifecycle.
3. **External services enrich through backends** — Maps and Paystack never let clients create platform truth directly.
4. **Security is role and scope based** — Auth, App Check, rules, Functions and immutable audit records work together.
5. **Development is incremental** — Current deployed behavior and IDs are preserved through bounded, testable phases.

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
| Source file | Spaceman_Five_App_Ecosystem_Master_Plan.pdf |
| Format | PDF |
| PDF page count | 28 |
| Creator | Impress |
| Producer | LibreOffice 25.2.3.2 (X86_64) / LibreOffice Community |
| Creation date | D:20260715143305Z' |

## Page 2: Approved Platform Decisions and Non-Negotiables

<!-- Source page 2 -->

**Source section:** ARCHITECTURE PRINCIPLES

These decisions govern every future Codex task, migration and deployment.

### 1. Platform truth

1. **One Firebase project** — No second backend, duplicate collection set or disconnected test data in production paths.
2. **Canonical Firestore records** — Orders, users, stores, items and operational records are shared across all five apps.
3. **Server timestamps** — Lifecycle, SLA, freshness and audit calculations use authoritative time.
4. **Historical snapshots** — Orders preserve customer/store/item/pricing meaning.

### 2. Experience boundaries

1. **Web stays web-native** — Admin, Merchant and Customer Web use appropriate React web UI.
2. **Mobile stays native** — Customer and Driver apps remain Expo React Native.
3. **Share logic, not forced UI** — Types, schemas, services and pure utilities belong in shared packages.
4. **Preserve existing IDs** — Firebase project and EAS project configurations remain intact.

### 3. Operational decisions

1. **Mabopane V1** — One delivery area, standard delivery and no surge pricing.
2. **Manual workflows remain** — Google/API imports are optional accelerators, not replacements.
3. **Archive/redact deletion** — Disable Auth and preserve required order/payment/audit history.
4. **Admin control plane** — Approvals, roles, refunds, assignment and exceptions remain audited.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 2 | 2

## Page 3: Five Apps, Shared Domain and External Platforms

<!-- Source page 3 -->

**Source section:** SYSTEM CONTEXT

Each app owns a role-specific experience but all data and command boundaries converge on the same backend.

### 1. Experience channels

1. **Admin Web** — configure, approve, assign, resolve
2. **Merchant Web** — confirm, prepare, ready, reject
3. **Customer Web** — browse, checkout, account, track
4. **Customer App** — mobile browse, pay, track, notify
5. **Driver App** — accept, navigate, locate, deliver

### 2. Shared domain packages

1. **firebase/** — typed clients/adapters
2. **types/** — canonical contracts/enums
3. **schemas/** — Zod command validation
4. **services/** — orders, stores, items, payments
5. **utils/** — money, status, time, formatting

### 3. Firebase platform

1. **Authentication** — identity and claims
2. **Firestore** — canonical operational database
3. **Cloud Functions** — commands, webhooks, schedulers
4. **Cloud Storage** — catalog/proof media
5. **Messaging/ Hosting/App Check delivery, web deploy, abuse protection**

### 4. External services

1. **Google Maps Routes** — distance, ETA and routing
2. **Geocoding / validation** — normalized addresses
3. **Paystack** — payments, refunds and webhooks
4. **Email / support** — fallback communications
5. **Observability** — logs, alerts and reconciliation

> **Source-of-truth rule**
>
> Clients display and request actions. Firestore contains canonical operational state. Cloud Functions and verified provider events protect privileged mutations and financial truth.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 3 | 3

## Page 4: Role, Scope and Capability Matrix

<!-- Source page 4 -->

**Source section:** ROLE ARCHITECTURE

Role guards in the UI are mirrored by Firestore rules and privileged backend checks.

### 1. Core capability matrix

| Capability | Customer | Merchant | Driver | Admin |
| --- | --- | --- | --- | --- |
| Browse marketplace | Active catalog | Own preview | Pickup context | All |
| Place / pay | Own checkout | No | No | Support only |
| Fulfillment status | Cancel/request | Confirm/prepare/ready | Pickup/on-way/<br>delivered | Override/resolve |
| Store / items | No | Own scoped | No | Create/import/<br>approve |
| Assignment | No | Read only | Acknowledge | Assign/reassign |
| Payment / refund | Pay/request | Read ledger | No | Initiate/resolve |
| Users / roles | Own profile | Own profile | Own profile | Scoped / super-<br>admin |

### 2. Scope invariants

1. **Customer ownership** — Reads own profile, orders, addresses, favorites and notifications only.
2. **Merchant store scope** — Reads/writes only approved assigned storeIds and allowed fields/transitions.
3. **Driver assignment scope** — Reads assigned work and writes narrow delivery commands/location.
4. **Admin access** — Explicit, audited and separated from Super Admin role assignment.
5. **System actors** — Payment, scheduled jobs and notifications use service identities / Functions.

> **Authorization rule**
>
> Hidden buttons are not security. Every protected request is evaluated against authentication, role/status, resource ownership, immutable fields and allowed state transition.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 4 | 4

## Page 5: Complete Customer-to-Delivery Sequence

<!-- Source page 5 -->

**Source section:** END-TO-END WORKFLOW

The platform coordinates payment, merchant fulfillment, dispatch and final delivery through one canonical order.

### 1. Primary sequence

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Discover | Customer selects store/items/address |
| 2 | Quote | Backend validates catalog, distance and fee |
| 3 | Pay | Paystack transaction initialized server-side |
| 4 | Paid order | Verified event activates merchant queue |
| 5 | Fulfill | Merchant confirms, prepares and marks ready |
| 6 | Dispatch | Admin/system assigns eligible driver |
| 7 | Deliver | Driver pickup, route and completion |
| 8 | Close | Customer history, ledger, notifications and audit |

### 2. Cross-system ownership

| Step | Primary writer | Canonical records / events | Other channel reaction |
| --- | --- | --- | --- |
| Discover / cart | Customer channel | catalog reads, provisional cart | No order truth yet |
| Quote | Cloud Function / pricing service | quote, fee-rule version, distance | Customer confirms final total |
| Payment | Paystack + webhook handler | payment reference/event/status | Merchant remains blocked until paid |
| Fulfillment | Merchant command Functions | orderStatus + timestamps/history | Customer/admin/driver update |
| Assignment | Admin/dispatch Function | driverId, assignment version | Driver notification |
| Tracking | Driver + Maps service | location projection, route/ETA, status | Customer/admin visibility |
| Completion | Driver command Function | deliveredAt, history, stop tracking | Ledger/analytics/notification |

> **Recovery principle**
>
> Every step can be retried or resumed by stable IDs. A client restart, duplicate webhook or repeated command must resolve to the same canonical outcome, not duplicate value.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 5 | 5

## Page 6: Canonical Lifecycle, Allowed Writers and Exceptions

<!-- Source page 6 -->

**Source section:** ORDER DOMAIN

All five apps see the same lifecycle; each transition has one permitted actor and server validation.

### 1. Happy-path lifecycle

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Pending / placed | Customer |
| 2 | Payment processing | System |
| 3 | Paid | Paystack verify/webhook |
| 4 | Confirmed | Merchant |
| 5 | Preparing | Merchant |
| 6 | Ready for pickup | Merchant |
| 7 | Driver assigned | Admin/dispatch |
| 8 | On the way | Driver |
| 9 | Delivered | Driver |

### 2. Exception and needs-action model

| Reason / branch | Trigger | Owner / resolution | Required effect |
| --- | --- | --- | --- |
| PAYMENT_FAILED | Provider unsuccessful | Customer retry / system | No fulfillment |
| NO_DRIVER_ASSIGNED | Paid/active order lacks driver | Admin/dispatch | Assign eligible driver |
| MERCHANT_NOT_RESPONDING | Confirmation SLA exceeded | Admin contacts/resolves | Activity + safe customer status |
| ORDER_DELAYED | ETA/SLA breached | Admin/driver/merchant | Contact/reassign/update |
| ADDRESS_PROBLEM | Validation or delivery issue | Customer/admin/driver | Correct or cancel by policy |
| DRIVER_LOCATION_STALE | Freshness threshold exceeded | Admin/driver | Refresh/contact/reassign |
| REFUND_PENDING | Refund command not final | Admin/payment handler | Reconcile provider result |
| CANCELLED / REFUNDED | Approved terminal branch | Backend/provider | Close fulfillment and notify |

> **Transition invariant**
>
> No UI may jump Pending to Delivered, mark Paid without verified provider data, overwrite assignment ownership or refund more than the captured amount.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 6 | 6

## Page 7: orders/{orderId} Record and Historical Integrity

<!-- Source page 7 -->

**Source section:** CANONICAL DATA

The order document is both a transaction snapshot and a live fulfillment state.

### 1. Canonical order sections

1. **Identity / channel** — orderId, customerId/snapshot, storeId/snapshot, merchantId, driverId/snapshot and source channel.
2. **Items** — Immutable item snapshots: ID, name, quantity, unit price, modifiers and totals.
3. **Pricing** — Subtotal, delivery/service fees, discounts, total, currency and rule versions.
4. **Payment** — Provider, reference, status, verified amount, event and refund references.
5. **Delivery** — Address snapshot, geo, instructions, distance, route ETA and tracking policy.
6. **Lifecycle** — Current/previous status, reasons, needsAction, timestamps, history refs and schemaVersion.

### 2. Data invariants

1. **Money is authoritative** — Backend calculates and verifies exact amount/currency.
2. **Snapshots are immutable** — Mutable user/store/item documents never rewrite history.
3. **Enums are shared** — All apps compile against one status/reason contract.
4. **Timestamps are server- owned SLA and freshness never depend on local clocks.**
5. **Schema versioning** — Readers tolerate approved old versions; migrations are explicit.
6. **Audit is append-only** — Commands record actor, intent, result and before/after.

> **Exact path caveat**
>
> orders/{orderId} is fixed by the approved blueprint. Other collection names below are a recommended logical contract and must be confirmed against the current repository/deployment before implementation.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 7 | 7

## Page 8: Logical Firestore Collections and Ownership

<!-- Source page 8 -->

**Source section:** DATA MODEL

Collections are normalized around ownership and operational queries while orders keep transaction snapshots.

### 1. Core collection contract

| Collection | Primary content | Owner / writer |
| --- | --- | --- |
| users/{uid} | role, status, profile, storeScope | self allowed fields +<br>admin/server |
| stores/{storeId} | identity, geo, hours, source, state | admin + scoped merchant |
| items/{itemId} | store catalog, media, availability | admin + scoped merchant |
| orders/{orderId} | canonical transaction/lifecycle | channel transitions + server |
| feeRules/{ruleId} | versioned store/zone pricing | admin/server |
| notifications/{id} | recipient event/read state | system + recipient read<br>state |
| activities/{id} | requests, alerts, issues, status | system/admin + scoped<br>submitter |
| auditLogs/{id} | immutable command history | server only |

### 2. Supporting records

1. **importBatches/{id}** — Preview, validation, selected rows, results and idempotency.
2. **paymentEvents/{id}** — Provider event ID, signature result, reference and processing status.
3. **quotes/{id}** — Short-lived authoritative checkout quote and expiry.
4. **driverLocations** — Current/order-scoped location projection and freshness metadata.
5. **assignments / outbox** — Versioned assignment and reliable notification/event delivery.
6. **settlement ledger** — Order financial snapshot, commission and payout/reconciliation state.

> **Schema discipline**
>
> Every mutable document carries schemaVersion, createdAt and updatedAt. Queries use designed indexes and bounded scopes; collection names are not changed casually after deployment.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 8 | 8

## Page 9: Firebase Component Responsibilities

<!-- Source page 9 -->

**Source section:** FIREBASE ARCHITECTURE

Firebase is one integrated platform, but each component has a separate security and operational responsibility.

### 1. Identity and client trust

1. **Authentication** — sessions and providers
2. **Custom claims / user role coarse role signal**
3. **App Check** — authorized app attestation
4. **Route guards** — client experience
5. **Token lifecycle** — sign-out and invalidation

### 2. Operational data

1. **Firestore** — canonical state and queries
2. **Transactions/ batches** — coupled writes
3. **Indexes** — operational query plans
4. **Rules** — ownership / immutable fields
5. **Emulator Suite** — security integration tests

### 3. Trusted execution

1. **Callable/HTTP Functions** — commands and provider APIs
2. **Firestore triggers** — outbox/notifications/activity
3. **Scheduled Functions** — stale/SLA/cleanup jobs
4. **Secrets/config** — Paystack and provider credentials
5. **Logging** — command and provider outcomes

### 4. Media and delivery

1. **Cloud Storage** — store/item/proof media
2. **Storage rules** — scoped uploads/access
3. **Cloud Messaging** — push notifications
4. **Hosting** — web deployments
5. **Analytics/ Crash reporting** — when enabled by policy

> **One-project constraint**
>
> Admin, Merchant, Customer Web/App and Driver App must use the same intended Firebase project configuration per environment. Environment separation is explicit, not accidental duplicate production backends.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 9 | 9

## Page 10: Authentication, Claims, App Check and Session Rules

<!-- Source page 10 -->

**Source section:** IDENTITY & TRUST

Identity, authorization and app attestation solve different problems and must not be confused.

### 1. Authentication

1. **Sign-in identity** — Firebase Auth proves the current user/session.
2. **Role bootstrap** — users/{uid}.role/status plus controlled custom claim.
3. **Status enforcement** — Suspended/archived users fail operational routes and rules.
4. **Token refresh** — Role/status changes account for existing sessions.

### 2. Authorization

1. **Rules ownership** — Customer uid, merchant storeIds and driver assignment.
2. **Protected fields** — Payment, claims, totals, assignment and audit are immutable to clients.
3. **Function checks** — Every command revalidates actor and resource state.
4. **Super Admin** — Role creation/critical settings restricted and audited.

### 3. App Check / abuse

1. **Attestation** — Helps reject traffic from unauthorized app clients.
2. **Not user auth** — A valid app token does not grant resource ownership.
3. **Rate / replay controls** — Command IDs, provider event IDs and server limits.
4. **Audit alerts** — Repeated denials, invalid signatures and anomalies create signals.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 10 | 10

## Page 11: Cloud Functions, Commands, Triggers and Scheduled Work

<!-- Source page 11 -->

**Source section:** TRUSTED BACKEND

Functions form the privileged command boundary between role-specific clients and protected state.

### 1. Command families

1. **Identity commands** — Create/assign roles, suspend/unsuspend and archive/redact.
2. **Store/catalog commands** — Import staging, publish, privileged delete and cleanup.
3. **Order commands** — Quote, confirm, prepare, ready, assign, pickup, delivered, cancel override.
4. **Payment commands** — Initialize, verify, webhook, refund and reconciliation.
5. **Support commands** — Create/resolve activities, notifications and audit entries.

### 2. Execution patterns

1. **Idempotency** — Stable command/event key persisted before external or value-changing mutation.
2. **Transactions / outbox** — Couple canonical change, history, audit and notification intent.
3. **Retries** — Exponential backoff for transient providers; safe repeated commands.
4. **Scheduled monitors** — Merchant SLA, stale driver location, stuck payment/refund and cleanup.
5. **Failure visibility** — Final failures create actionable activities and structured logs.

> **Function response contract**
>
> Return the refreshed canonical resource or a typed error. Clients must not manufacture success from an optimistic local transition.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 11 | 11

## Page 12: Cloud Storage, Messaging and Event Delivery

<!-- Source page 12 -->

**Source section:** MEDIA & NOTIFICATIONS

Media and notifications are secondary projections with explicit ownership and cleanup.

### 1. Cloud Storage

1. **Store media** — Card/hero images with attribution and responsive derivatives.
2. **Item media** — Compressed source, thumbnail and stable URL metadata.
3. **Proof media** — Private, order-scoped and retention-limited when enabled.
4. **Upload policy** — Type, size, path ownership and malware/content considerations.
5. **Cleanup** — Delete orphaned assets only after reference checks and audit.

### 2. Notification architecture

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Domain event | Order/role/support change |
| 2 | Outbox | Stable event ID and recipients |
| 3 | Dispatch | FCM, web push or email |
| 4 | Delivery result | sent / failed / retry |
| 5 | In-app record | read state and deep link |

- Use recipient-specific notification documents and never expose another user's messages.
- Deduplicate channels using one logical event ID.
- Invalid device tokens are removed and repeated failures become observable.
- Notifications are not the source of truth; opening the app always refreshes canonical data.

> **Operational priority**
>
> New paid orders, assignments, readiness and critical exception notifications require stronger monitoring than marketing messages.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 12 | 12

## Page 13: Address, Route, Distance, ETA and Location Architecture

<!-- Source page 13 -->

**Source section:** GOOGLE CLOUD / MAPS

Google Maps data is normalized through shared services so all apps use one interpretation.

### 1. Google components

1. **Place / address search** — User or admin selects a result rather than storing unverified free text alone.
2. **Geocoding / reverse geocoding** — Resolve validated coordinates and human-readable address context.
3. **Address validation** — Confirm required delivery components and serviceability.
4. **Routes / Route Matrix** — Store-to-customer and driver routes, distance and ETA.
5. **Maps UI / external navigation** — Channel-specific map rendering and driver navigation handoff.

### 2. Normalized data and governance

| Output | Canonical use | Freshness / rule |
| --- | --- | --- |
| formattedAddress + place<br>reference | store/customer address snapshot | Validated at selection/checkout |
| GeoPoint | Serviceability, route and map | Immutable within order snapshot |
| distanceKm | Delivery fee and operational context | Quote-time source timestamp |
| routeEtaMinutes | Customer/admin estimate | Refresh under controlled policy |
| route reference/polyline | Map display/navigation | Do not duplicate blindly in every<br>app |
| driver location | Tracking projection | Throttled, assignment-scoped,<br>expires |
| provider status/error | Activity/diagnostics | Never fabricate fallback truth |

> **Current API direction**
>
> Use current Google Routes / Route Matrix capabilities through a backend adapter rather than allowing each app to implement its own distance/ETA formula or depend on a legacy assumption.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 13 | 13

## Page 14: Paystack Initialization, Verification, Webhooks and Refunds

<!-- Source page 14 -->

**Source section:** PAYSTACK ARCHITECTURE

Paystack is the external financial authority; the Spaceman backend maps verified events into canonical payment state.

### 1. Payment lifecycle

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Quote accepted | Exact total and checkout ID |
| 2 | Initialize server-side | Secret key in protected backend |
| 3 | Customer completes | Popup/redirect/mobile supported flow |
| 4 | Callback/resume | Reference only; show processing |
| 5 | Verify / webhook | Signature, event ID, amount, currency |
| 6 | Apply once | Payment event + order state + audit |
| 7 | Refund command | Admin/backend and provider confirmation |

### 2. Payment protection matrix

| Control | Required behavior | Risk prevented |
| --- | --- | --- |
| Secret key | Functions/server secrets only | Credential theft and direct provider abuse |
| Unique reference | Stable checkout/order mapping | Duplicate value and ambiguous reconciliation |
| Verify amount/currency | Compare provider response to stored quote | Underpayment / tampering |
| Webhook signature | Validate provider authenticity | Forged paid/refund events |
| Event idempotency | Persist processed event ID/reference | Replay / duplicate mutation |
| Callback rule | Never mark paid from client callback alone | False success |
| Refund validation | Captured state, amount limit and reason | Over-refund / unauthorized refund |
| Reconciliation job | Resolve stuck processing/pending events | Lost asynchronous updates |

> **Merchant and driver boundary**
>
> Neither Merchant Web nor Driver App writes payment state. Merchant fulfillment starts only after the backend exposes a verified paid order.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 14 | 14

## Page 15: Delivery Fee, Commission and Settlement Snapshot

<!-- Source page 15 -->

**Source section:** PRICING & FINANCE

Pricing rules are versioned and snapshotted into orders so future configuration changes do not alter history.

### 1. Delivery fee V1

1. **Formula** — clamp(min, max, base + max(0, distance - included) × perKm + small-order surcharge).
2. **Launch values** — Mabopane example: base, included km, per-km rate, threshold/surcharge and min/max.
3. **Distance source** — Google route distance normalized by backend.
4. **Rule version** — feeRuleId/version and inputs captured in quote/order.
5. **Expansion** — Zones, multiple delivery methods and surge only in later approved phases.

### 2. Order financial snapshot

| Component | Purpose | Authority |
| --- | --- | --- |
| itemsSubtotal | Customer items before platform fees | Authoritative item snapshots |
| deliveryFee | Logistics fee by route/rule | Backend pricing service |
| serviceFee | Optional platform fee | Versioned policy |
| discounts | Promotion application | Backend eligibility |
| total | Customer charge | Backend + Paystack amount<br>verify |
| commissionSnapshot | Store commission basis | Versioned platform/store policy |
| netMerchantAmount | Ledger calculation | Backend finance projection |
| refundAmount/status | Returned value | Paystack confirmed event |

> **Finance honesty**
>
> Do not display a merchant payout as paid without a trusted settlement reference. V1 may use a read-only order ledger and manual settlement workflow.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 15 | 15

## Page 16: Read/Write Ownership by App

<!-- Source page 16 -->

**Source section:** CROSS-APP CONTRACT

Each client has a narrow responsibility over the shared records.

### 1. Application writes

| Actor | Allowed intent | Prohibited direct truth |
| --- | --- | --- |
| Customer App/Web | profile fields, checkout request, customer notes,<br>cancel/support request | paid/refund status, final quote,<br>other users |
| Merchant Web | confirm, preparing, ready, cannot-fulfill, scoped<br>catalog/store edits | payment, assignment, delivered |
| Driver App | availability, acknowledgement, pickup, location,<br>delivered, issue report | payment, store/catalog, other driver<br>assignment |
| Admin Web | approvals, assignment, overrides, refund commands,<br>settings | provider event fabrication |
| Paystack handler | verified payment/refund events | non-payment domain edits |
| Maps service | validated address/route enrichment | order lifecycle ownership |

### 2. Application reads

1. **Customer** — Public active catalog; own profile, order history, tracking and notifications.
2. **Merchant** — Assigned stores, own catalog, store order queue and ledger projection.
3. **Driver** — Assigned/eligible work, scoped pickup/drop-off data and own notifications.
4. **Admin** — All operationally scoped records, activities, settings and audits.
5. **System** — Service reads required for commands, monitoring, reconciliation and cleanup.

> **Command contract**
>
> High-impact writes are expressed as typed commands rather than open-ended document updates. Functions validate intent and return canonical results.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 16 | 16

## Page 17: Admin Responsibilities Across the Ecosystem

<!-- Source page 17 -->

**Source section:** ADMIN CONTROL PLANE

Admin Web is the operational control plane, not a duplicate of role-specific apps.

### 1. Configuration

1. **Users / roles** — Create roles, assign scopes, suspend/unsuspend and archive/redact.
2. **Stores / items** — Manual create, imports, approvals, edits and privileged retirement.
3. **Pricing / zones** — Versioned delivery fee and platform settings.
4. **Integrations** — Provider configuration health and safe environment status.

### 2. Operations

1. **Orders** — Monitor queues, assign/reassign, resolve needs-action and override with reason.
2. **Activities** — Support, deletion requests, alerts and integration failures.
3. **Refunds** — Validate state/amount and initiate trusted payment command.
4. **Audit** — Review immutable actor/resource/result history.

### 3. Insight

1. **SLA metrics** — Merchant response, assignment, pickup and delivery times.
2. **Payment reconciliation** — Paid/refund/provider mismatches and stuck events.
3. **Catalog quality** — Availability, images, price/schema and import issues.
4. **Reliability** — Function errors, stale location, notification delivery and app releases.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 17 | 17

## Page 18: Defense in Depth and Sensitive Commands

<!-- Source page 18 -->

**Source section:** SECURITY ARCHITECTURE

Security is enforced from route to provider and produces immutable evidence.

### 1. Defense layers

1. **1. Route/UI guard** — Correct experience and reduced accidental actions.
2. **2. Shared schemas** — Typed payload and transition intent.
3. **3. App Check** — Authorized app attestation.
4. **4. Firestore/Storage rules** — Ownership, scope and protected fields.

### 2. Trusted boundaries

5. **5. Cloud Functions** — Role, state, idempotency and provider secrets.
6. **6. Provider verification** — Paystack signature and exact financial checks.
7. **7. Audit / alert** — Actor, target, result and suspicious failures.
8. **8. Reconciliation** — Independent checks find missing/asymmetric truth.

### 3. Sensitive commands

1. **Role / suspension** — Super-admin/admin policy and token consistency.
2. **Store deletion** — Privileged cleanup, preserve historical orders.
3. **Refund** — Captured amount, reference, idempotency and result.
4. **Order override** — Allowed matrix, reason and notification.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 18 | 18

## Page 19: Activities, Audit Logs, Metrics and Reconciliation

<!-- Source page 19 -->

**Source section:** OBSERVABILITY

Operational problems become visible work rather than silent client errors.

### 1. Human work queue

1. **Activities** — Support, account requests, system alerts, fee changes and integration failures.
2. **Needs action** — Derived order reasons and context-sensitive admin commands.
3. **Ownership / priority** — Assigned admin, status, timestamps and resolution note.
4. **User notification** — Safe outcome communicated after resolution.

### 2. Immutable evidence

1. **Audit log** — actor, command ID, resource, before/after, result and duration.
2. **Function logs** — Structured provider/request correlation without secret leakage.
3. **Payment events** — Signature result, event ID, reference and processing state.
4. **Status history** — Order transition actor, from/to, reason and timestamp.

### 3. Metrics / reconciliation

1. **Funnel** — Browse, cart, checkout, paid, delivered and cancelled.
2. **Operations** — Merchant/driver SLA, stale location and delivery time.
3. **Finance** — Paystack vs order/payment/refund/ledger state.
4. **Reliability** — Function errors, notification failures and release health.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 19 | 19

## Page 20: Five-App Workspace and Dependency Boundaries

<!-- Source page 20 -->

**Source section:** MONOREPO ARCHITECTURE

The workspace consolidates code without creating app-to-app coupling.

### 1. apps/

1. **admin-web/** — React + TypeScript
2. **merchant-web/** — React + TypeScript
3. **customer-web/** — React web
4. **customer-app/** — Expo React Native
5. **driver-app/** — Expo React Native

### 2. packages/shared/

1. **firebase/** — client adapters
2. **types/** — domain contracts
3. **schemas/** — validation
4. **services/** — business operations
5. **utils/** — pure helpers

### 3. backend / config

1. **firebase/ functions/** — trusted commands
2. **firestore.rules** — authorization
3. **indexes/** — query plans
4. **storage.rules** — media access
5. **packages/ config/** — tsconfig/lint/env validation

### 4. automation

1. **scripts/** — checks/migrations
2. **tests/** — unit/emulator/E2E
3. **CI/** — affected app pipelines
4. **deploy/** — environment targets
5. **docs/** — architecture and decision log

> **Dependency direction**
>
> apps/* -> packages/shared -> Firebase/external SDKs. No shared -> app imports, no app -> app imports and no forced web/mobile UI reuse.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 20 | 20

## Page 21: Configuration, Secrets, CI/CD and Deployment

<!-- Source page 21 -->

**Source section:** ENVIRONMENTS & DELIVERY

Environment isolation must be explicit while preserving one coherent production platform.

### 1. Environment model

1. **Local / emulator** — Firebase Emulator Suite, test provider keys and seed fixtures.
2. **Development / preview** — Controlled non-production project or approved isolated configuration.
3. **Production** — Existing Firebase/Paystack/Maps resources with strict secrets and deployment gates.
4. **Environment validation** — Typed required variables; fail build/start when missing or mixed.
5. **Secrets** — Paystack secret/webhook values and server keys never in client bundles or Git.

### 2. Delivery pipeline

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Inspect changes | Affected apps/backend |
| 2 | Static checks | typecheck, lint, unit |
| 3 | Integration | emulator rules/functions |
| 4 | Build | web + Expo affected targets |
| 5 | Deploy backend | rules/functions/indexes first when required |
| 6 | Deploy clients | hosting / EAS release |
| 7 | Smoke / monitor | provider and cross-app verification |

- Deploy backend compatibility before clients that depend on new schema or commands.
- Use versioned migrations and backward-compatible readers during rollout.
- Record release version and schema/function deployment in the audit/change log.
- Rollback plans must consider provider/webhook and partially migrated data.

> **No accidental production mixing**
>
> Every app should display/log its environment identifier internally. CI validates Firebase project ID, Paystack mode and Maps configuration as a consistent set.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 21 | 21

## Page 22: Listener, Query, Media, Maps and Cost Guardrails

<!-- Source page 22 -->

**Source section:** PERFORMANCE & SCALE

Scale is achieved by bounded work and explicit freshness policies, not by making everything realtime.

### 1. Data and listeners

1. **Scoped realtime** — Active order/queue only; unsubscribe on route/tab exit.
2. **Pagination** — Server-backed histories, catalogs and admin lists.
3. **Indexes** — Design composite indexes for actual filters and date ranges.
4. **Snapshots** — Denormalized order display data avoids repeated joins.

### 2. Assets and maps

1. **Images** — Compress, thumbnail, lazy-load and safely clean orphans.
2. **Maps** — Lazy-load panels, cache routes within freshness window.
3. **Driver location** — Throttle by movement/time/state; stop when completed.
4. **Provider calls** — Backend caching/deduplication and quotas with observability.

### 3. Application bundles

1. **Web splitting** — Route-level chunks and no mobile/admin library leakage.
2. **Mobile lists** — Virtualized rendering and restrained animations/blur.
3. **Cache policy** — Catalog/cacheable data yes; payment truth no.
4. **Cost signals** — Reads, Functions, Storage, FCM, Maps and provider volumes measured.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 22 | 22

## Page 23: Idempotency, Transactions, Retry and Cleanup

<!-- Source page 23 -->

**Source section:** RELIABILITY

Every money-changing or lifecycle-changing operation is safe under duplication, interruption and partial failure.

### 1. Reliability patterns

1. **Stable IDs** — checkoutId, payment reference, provider event ID, command ID and importBatchId.
2. **Transactions / batches** — Canonical state, status history, audit and outbox move together.
3. **Optimistic limits** — Only reversible low-risk UI edits; never paid/refunded/delivered truth.
4. **Retry policy** — Exponential backoff for transient providers; typed final failure.
5. **Schema compatibility** — Backward-compatible readers and explicit migration scripts.

### 2. Automated safeguards

1. **Payment reconciliation** — Verify stuck processing and mismatched paid/refund states.
2. **SLA monitors** — Merchant response, assignment, delay and stale location activities.
3. **Cleanup** — Expired quotes, abandoned imports, invalid tokens and orphaned media.
4. **Data consistency** — Detect role/claim/scope disagreement and invalid references.
5. **Backup/export policy** — Document recovery objectives before destructive migrations.

> **Fallback honesty**
>
> Maps/payment/notification failures must not silently fabricate successful state. Surface a retry, safe block or admin activity.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 23 | 23

## Page 24: Cross-App Test Matrix and Production Acceptance

<!-- Source page 24 -->

**Source section:** TEST STRATEGY

Testing follows the user journey and the security boundary, not only individual screens.

### 1. Test layers

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Unit | Schemas, money, fee and status matrix |
| 2 | Rules | Ownership and protected fields |
| 3 | Functions | Commands, webhooks and idempotency |
| 4 | Web E2E | Admin, Merchant and Customer Web |
| 5 | Mobile smoke | Customer and Driver apps |
| 6 | Provider integration | Paystack and Maps failure/success |
| 7 | Production smoke | Cross-app flow and monitoring |

### 2. Critical acceptance scenarios

| Scenario | Apps / services | Pass condition |
| --- | --- | --- |
| Guest -> paid order | Customer + Functions + Paystack | Exactly one paid order and merchant notification |
| Merchant fulfillment | Merchant + order + notifications | Allowed transitions visible to all channels |
| Driver assignment/delivery | Admin + Driver + Maps + Customer | Race-safe assignment and scoped tracking |
| Payment webhook replay | Paystack handler + Firestore | No duplicate order/value/status mutation |
| Cross-role attack | Rules + Functions | Unauthorized read/write denied and logged |
| Refund | Admin + Paystack + ledger | Amount/state validated and provider result reconciled |
| Account deletion | Customer + Admin + Auth + cleanup | Login disabled, PII redacted, history retained |
| Release compatibility | Old/new client + schema | No breaking partial-deploy failure |

> **Production gate**
>
> No release passes on screenshots alone. Require static checks, emulator tests, affected builds, provider test evidence, manual role smoke and a documented rollback/monitoring plan.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 24 | 24

## Page 25: Start-to-End Implementation Roadmap

<!-- Source page 25 -->

**Source section:** DEVELOPMENT MASTER PLAN

This sequence reduces platform risk by stabilizing shared contracts and core transaction truth before advanced automation.

### 1. Major phases

| Step | Action | Detail |
| --- | --- | --- |
| 1 | 0. Inventory | Repo, deployment, data and decisions |
| 2 | 1. Monorepo baseline | Five app paths, shared packages and checks |
| 3 | 2. Identity/security | Roles, scope, rules, App Check |
| 4 | 3. Marketplace | Stores/items/manual/import/customer browse |
| 5 | 4. Checkout/payment | Maps quote and Paystack truth |
| 6 | 5. Fulfillment | Merchant, admin dispatch and Driver |
| 7 | 6. Operations | Activities, refunds, notifications, audit |
| 8 | 7. Quality/launch | Scale, reconciliation, release and runbooks |

### 2. Phase deliverables and gates

| Phase | Primary deliverables | Exit gate |
| --- | --- | --- |
| 0. Inventory | File map, Firebase paths, Functions, rules, EAS IDs, current tests | No unresolved source-of-truth conflict |
| 1. Monorepo | apps/* + packages/shared + scripts/config without breaking builds | All existing apps compile/run |
| 2. Security | Role/status/scope contract, rule tests, command boundary, App Check plan | Cross-role denial verified |
| 3. Marketplace | Admin + Merchant store/catalog, Customer browse, Storage media | Manual creation remains; active catalog consistent |
| 4. Checkout | Address, Routes/Matrix, fee quote, Paystack initialize/verify/webhook | Exactly one paid order per reference |
| 5. Fulfillment | Merchant queue, lifecycle, assignment, Driver pickup/location/delivery | End-to-end paid -> delivered works |
| 6. Operations | Needs-action, support, refund, account lifecycle, audit/notifications | Failures visible and financially reconciled |
| 7. Launch | Performance, backups, monitoring, CI/CD, runbooks, staged deployment | Production acceptance matrix passes |

> **Scope discipline**
>
> Each phase is decomposed into bounded features. Do not combine monorepo migration, schema redesign, payment integration and UI restyling in one Codex task.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 25 | 25

## Page 26: Required Prompt Contract for Every Development Task

<!-- Source page 26 -->

**Source section:** CODEX OPERATING MODEL

Use this checklist at the beginning and end of each bounded Codex task.

### 1. Preflight

1. **Inspect current state** — Repo files, git status, deployed behavior and relevant blueprint pages.
2. **Summarize completed work** — Do not restart, revert or repeat accepted progress.
3. **Declare scope** — Exact app/module/files/data paths and feature boundary.
4. **Impact analysis** — Schema, rules, Functions, indexes, environments and deployment.

### 2. Change constraints

- **! No second backend** — Preserve Firebase project, collections and EAS IDs.
- **! No rule loosening** — Fix architecture or command boundary instead.
- **! No unrelated refactor** — Patch bounded scope and preserve working methods.
- **! Safe sharing only** — No app-to-app UI imports or premature abstraction.

### 3. Verification/report

1. **Targeted tests** — Unit/emulator/E2E for changed behavior.
2. **Static/build** — Typecheck, lint and affected app builds.
3. **Firebase validation** — Rules, indexes, Functions and provider configuration.
4. **Complete report** — Files, schema/deploy changes, manual tests, risks and next step.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 26 | 26

## Page 27: Source Precedence, Assumptions and Change Governance

<!-- Source page 27 -->

**Source section:** DECISION CONTROL

Architecture evolves through explicit decisions rather than silent divergence between apps.

### 1. Source precedence and change process

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Current truth | Repo + deployed backend |
| 2 | Approved architecture | These blueprints and decisions |
| 3 | Mockup intent | UI/workflow visual reference |
| 4 | Conflict found | Stop and document |
| 5 | Decision approved | Update ADR/blueprint/schema |
| 6 | Bounded implementation | Test and deploy |

- Do not guess collection names, provider modes, current Functions or route paths.
- An architecture change names affected apps, data, security, migration, rollout and rollback.
- Deprecations use compatibility windows; clients are not broken by immediate schema replacement.
- The master plan is updated when a decision changes a cross-app contract.

### 2. Current assumptions to confirm

1. **Repository structure** — Target apps/* and packages/shared versus actual current paths.
2. **Collection names** — Only orders/{orderId} is explicitly fixed by source boards.
3. **Payment mode / payout** — Current Paystack setup, refund/payout automation and webhook endpoints.
4. **Maps APIs** — Enabled services, key restrictions, quotas and billing environment.
5. **Notification stack** — FCM/web push/email implementation and token model.
6. **Compliance / retention** — Approved privacy, proof and financial retention policy.

> **Architecture status**
>
> Main implementation plan from development start to production operation. Exact repo and cloud configuration remains the final technical truth and must be inspected before code changes.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 27 | 27

## Page 28: Master Plan Traceability and Current Decisions

<!-- Source page 28 -->

**Source section:** REFERENCE CONTROL

Traceability, current decisions and implementation assumptions.

### 1. Source-to-module traceability

| Source | Captured architecture detail | Used in this document |
| --- | --- | --- |
| Admin Web Architecture<br>Blueprint | System context, UI, roles, stores/items, orders, activities, data, security and<br>monorepo | Foundation for all pages |
| Current Projectweb deployments | Customer, Driver and Admin observed behavior and role experiences | Channel-specific flows |
| Monorepo migration plan | Five apps, shared package boundaries, one Firebase project and preserved<br>EAS IDs | Pages 20-26 |
| Store/item import decisions | Manual workflows remain first-class; imports require preview/review | Pages 17, 25 |
| Account lifecycle decision | Suspend/unsuspend and archive/redact instead of destructive history deletion | Pages 2, 10, 17, 24 |
| Official Paystack documentation | Backend initialization, secret protection, verification, amount checks and<br>webhooks | Page 14 |
| Firebase documentation | Auth, Firestore, Functions, Storage, Messaging, Hosting and App Check roles | Pages 9-12 |
| Google Maps Routes<br>documentation | Route, route matrix and normalized Maps enrichment | Page 13 |

### 2. Normalized decisions

- **Backend** — One Firebase project and one canonical data model.
- **UI stacks** — React web for web apps; Expo React Native for mobile.
- **Pricing V1** — Mabopane, standard delivery, no surge.
- **Payment** — Paystack server initialization and verified asynchronous truth.
- **Dispatch V1** — Manual admin assignment; future automation fits same contract.
- **Deletion** — Archive/redact + Auth disable; preserve required records.
- **Manual onboarding** — Manual stores/items remain available beside import methods.
- **Source precedence** — Repo/deployment > approved plan > mockups.

> **Document status**
>
> Architecture synthesis for implementation. Before changing code, validate exact collection names, existing Cloud Functions, deployed rules, current routes and environment variables against the monorepo.

> **Source footer:** SPACEMAN PROJECTS - FIVE-APP ECOSYSTEM - ARCHITECTURE Implementation reference for Codex / VS Code 28 | 28
