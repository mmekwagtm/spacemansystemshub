# API Cost Control

The Phase 3 development backend connects Firebase and a restricted Places API
adapter for marketplace testing. Routes, distance, fees, checkout Maps, and
payment providers remain disconnected. All live Phase 3 calls use the shared
real development Firebase project and controlled development credentials.

## Maps

`@spaceman/app-maps` owns contracts and backend-adapter interfaces. Screens do
not call Google APIs directly. Address search and routing use debounce, session
tokens, field masks, caching, lazy map loading, request limits, and structured
provider errors.

Checkout fails closed when serviceability, distance, or the delivery fee cannot
be authoritatively calculated. Driver location is foreground-only in V1 and is
throttled by movement, time, and active assignment state.

Phase 3 Google Places calls are server-only, use field masks, and stage editable
store candidates rather than publishing them. Item API import permits only
explicit HTTPS hosts, rejects private/link-local destinations and redirects,
and enforces response timeout, size, shape, and 500-row limits. CSV import has
the same 500-row ceiling. Import replay is content-hash/idempotency controlled.

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
