# Phase 3 native physical-device acceptance — 2026-07-24

Device: Samsung Galaxy Note9 (`SM-N960F`), connected by USB with the serial
redacted. Environment: development preview APKs, launched directly by Android
package with no Metro process running and without Expo Go.

| Client | Role/state attempted | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| Customer App | Guest launch | Reach `Marketplace foundation` and the development active catalog | APK reached its launch frame, then exited before rendering the app | **Fail** |
| Driver App | Guest launch | Reach `Driver sign in` without marketplace controls | APK reached its launch frame, then exited before rendering the app | **Fail** |

## Redacted ADB evidence

- The physical device was reported as connected.
- Both preview packages were installed and had Android package paths.
- Neither app required a Metro process to start its bundled JavaScript.
- Both apps raised the same safe runtime error:
  `AppError: Required public Firebase configuration is missing or invalid.`
- The error source was `app-config/expo`. The APK bundles were missing the
  required public Firebase fields: API key, app ID, auth domain, messaging
  sender ID, project ID, and storage bucket. No values were printed or stored.
- Expo Updates could not recover from the configuration error, so both
  processes exited.

The local launch-frame captures proved only that Android started each installed
package. They were not retained as tracked acceptance evidence because neither
app reached a workflow screen.

## Acceptance result

The native gate **fails**. Customer guest/authenticated catalog parity, cached
state, pagination, stale/offline behavior, session restoration, and sign-out
could not be tested. Driver sign-in, delivery-zone scope, session restoration,
sign-out, inactive-user denial, and absence of marketplace controls could not
be tested. Phase 3 must remain unaccepted until both preview APKs are rebuilt
with the complete development `EXPO_PUBLIC_FIREBASE_*` configuration and the
physical-device matrix is rerun.
