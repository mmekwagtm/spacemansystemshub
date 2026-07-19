# API Cost Control

The source baseline implements Maps adapter contracts, controlled query
boundaries, and a checkout Function that fails closed until an authoritative
quote exists. No live Maps, Firebase, Storage, Functions, or payment provider
configuration is connected. When wired, all calls must use the shared real
development Firebase project and controlled development credentials.

## Maps

`@spaceman/app-maps` owns contracts and backend-adapter interfaces. Screens do
not call Google APIs directly. Address search and routing use debounce, session
tokens, field masks, caching, lazy map loading, request limits, and structured
provider errors.

Checkout fails closed when serviceability, distance, or the delivery fee cannot
be authoritatively calculated. Driver location is foreground-only in V1 and is
throttled by movement, time, and active assignment state.

## Firebase and media

Use limited, ordered, indexed, paginated Firestore queries. Realtime is only
for active operational views. Use Cloud Storage for media, compressed sources,
thumbnails, lazy loading, and audited orphan cleanup.

Record and review reads, Functions invocations, Storage usage, FCM delivery,
Maps calls, and provider failures before increasing quotas or adding polling.
