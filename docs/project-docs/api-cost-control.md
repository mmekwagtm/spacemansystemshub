# API Cost Control

The accepted Phase 3 development backend connects Firebase and a restricted
Places API adapter. Nine Phase 4 Functions are active, but Phase 4 remains
unaccepted pending provider, payment, cleanup, browser, and device gates.

## Maps

`@spaceman/app-maps` owns contracts and backend-adapter interfaces. Screens do
not call Google APIs directly. Address search and routing use debounce, session
tokens, field masks, caching, lazy loading, request limits, and structured
provider errors.

Source adds per-runtime actor budgets, a 20-second address cache, bounded
instances, and decision logs. These changes are not deployed by this change;
Firebase and Google quotas remain the cross-instance cost boundary.

Checkout fails closed when serviceability, distance, or the delivery fee cannot
be authoritatively calculated. Driver location is foreground-only in V1 and is
throttled by movement, time, and active assignment state.

Phase 4 address autocomplete begins after three characters, is debounced by
350 ms, uses one Google session token per selection flow, requests at most five
ZA results, and applies explicit field masks. Place Details requests only ID,
formatted address, coordinates, and address components. Routes requests only
distance and duration, uses a ten-second provider timeout, and runs once per
new quote. Idempotency replays return the existing checkout rather than
repeating provider calls.

Paystack is initialized and verified only by trusted Functions. Clients poll
only on return/focus/resume or an explicit user action; no background payment
polling loop is used. The fixed return page has no provider verification or
write side effect.

Phase 3 Google Places calls are server-only, use field masks, and stage editable
store candidates rather than publishing them. CSV import is capped at 400
candidate rows and replay is content-hash/idempotency controlled. External
JSON/HTTPS catalog fetching and its host allowlist are prohibited, so the
backend makes no arbitrary remote catalog requests.

## Firebase and media

Use limited, ordered, indexed, paginated Firestore queries. Realtime is only
for active operational views. Use Cloud Storage for media, compressed sources,
thumbnails, lazy loading, and audited orphan cleanup.

Record and review reads, Functions invocations, Storage usage, FCM delivery,
Maps calls, and provider failures before increasing quotas or adding polling.

Marketplace reads use indexed cursor pagination with a maximum of 50 records,
TanStack Query caching/invalidation, and no catalog realtime listeners. Web
marketplace panels are lazy-loaded; media uses compressed originals,
thumbnails, browser lazy loading, and exact orphan cleanup.
