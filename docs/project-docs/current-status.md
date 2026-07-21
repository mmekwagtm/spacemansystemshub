# Current Status

## Accepted baseline

- Phase 0 (architecture truth), Phase 1 (monorepo baseline), and Phase 2
  (identity and security) are complete.
- The canonical workspace contains three Vite/React web apps, two Expo Router
  native apps, shared `@spaceman/*` packages, and a separate Firebase Functions
  runtime.
- The original architecture and visual source documents remain preserved.
- The architecture has exactly eight phases, `0` through `7`; Phase 7
  production acceptance is the only project-complete endpoint.
- Testing, review, commits, pushes, and production deployment remain manual.

## Phase 2 accepted state

Phase 2 source, development-cloud, automated, live-security, and manual
five-client identity acceptance are complete.

- All five apps use app configuration, Firebase gateway, service, and shared
  auth layers. Screens do not import Firebase or another app directly.
- Customer Web and Customer App implement guest, registration, verification,
  sign-in, claims refresh, protected-boundary, session restoration, and
  sign-out states.
- Admin Web, Merchant Web, and Driver App implement invitation/password setup,
  role/status/scope guards, session restoration, refresh, and sign-out.
- Firestore, the default Storage bucket, Firestore/Storage Rules, and six
  identity callable Functions are live in the `spacemansystemsbackend`
  development project and `africa-south1`.
- The canonical profile is checked by both Rules and Functions, so suspended
  and archived stale tokens fail immediately. User-status transitions reject
  replay and make `archived` terminal.
- App Check enforcement is intentionally deferred per `app-check.md` to avoid
  locking out web localhost and Expo Go clients before providers and
  development builds are ready.

## Dependency and cleanup state

- The root pnpm installation and lockfile are synchronized. SDK-compatible
  AsyncStorage, gesture-handler, Reanimated, Worklets, and Metro packages were
  added to the native manifests; `expo install --check` passes for both apps.
- `firebase/functions` keeps only deployable npm registry dependencies at
  runtime; shared workspace source is bundled at build time because Cloud
  Build cannot install `workspace:*` dependencies with npm.
- Both native `google-services.json` files are present locally, ignored, and
  removed from Git tracking. App-specific Android package names are declared.
- Generated builds, Expo caches, Playwright output, secrets, `.env.local`, and
  dependency directories remain ignored. The native Firebase configuration
  files remain available locally and are no longer tracked by Git.
- The Firebase CLI reports the current `firebase-functions` v6 dependency as
  behind the latest major. Its breaking upgrade is deferred to a bounded Phase
  3 maintenance change instead of being mixed into the Phase 2 security
  release.

## Validation evidence

On 2026-07-21 the implemented checkout passed:

- Shared package and Firebase Functions type-check, lint, unit tests, and
  deployable bundle.
- Unit tests and production builds for all three web apps.
- TypeScript, lint, Jest, Expo dependency compatibility, and Android production
  export for Customer App and Driver App.
- Playwright Chromium acceptance for Admin Web, Merchant Web, and Customer Web.
- A real development-project identity matrix using exact test run
  `phase2_identity_1784610317153_749c82ef`: customer registration/verification,
  own read, protected-field denial, cross-role/user/store/driver denial,
  trusted staff lifecycle, replay denial, immediate suspended/archived stale
  token denial in Functions and Rules, Storage denial, and verified Auth plus
  Firestore cleanup.
- Owner-provided Phase 2 evidence under `docs/live-test-data-docs/` covers
  customer verification, staff invitation/setup, role/inactive boundaries,
  session behavior, and the current Customer and Driver Expo Go apps.

The web production builds report large Firebase entry chunks of roughly 745 KB
uncompressed (about 192 KB compressed). This is a Phase 3 code-splitting and
performance item, not an identity correctness failure.

## Remaining later-phase actions

- Rotate the Paystack **test** secret before any Phase 4 payment work because
  the original value appeared in diagnostic output during setup.
- Complete future provider, marketplace, and release gates only in their owning
  phases. No Phase 2 acceptance action remains.

## Next phase gate

Phase 2 is complete and overall accepted progress is 37.5%. Phase 3
(Marketplace) is next at 0% / not started and requires its own approved bounded
plan before implementation.
