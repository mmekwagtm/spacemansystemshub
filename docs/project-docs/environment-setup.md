# Environment Setup

## Environment policy

All five applications and Cloud Functions use one shared, real Firebase
**development** project. Firebase emulators are not used. Production is a
separate, gated future environment and must not be configured or deployed
without explicit approval.

## Current development Firebase state

- Project `spacemansystemsbackend` has email/password Authentication, a
  Standard Firestore database, the default Firebase Storage bucket, the six
  Phase 2 identity Functions, and the 13 Phase 3 marketplace Functions in
  `africa-south1`.
- All five ignored `.env.local` files select that project and region.
- Customer App and Driver App have app-specific Android packages and local,
  ignored `google-services.json` files downloaded from their registered
  Firebase Android applications.
- Phase 3 Firestore Rules, Storage Rules, and composite indexes are deployed to
  development. Storage permits only scoped catalog staging writes and active
  published catalog reads; unrelated paths remain denied.
- The Firebase callable transport `roles/run.invoker`/`allUsers` binding is
  owner-approved and applied to exactly the 13 Phase 3 Cloud Run services.
  Each handler still enforces Firebase Auth and canonical role/status/scope.
- The development server key stored as `GOOGLE_MAPS_SERVER_API_KEY` is
  API-restricted to the Places backend service, Places API (New), and Routes
  API. It is not a client input. External JSON/HTTPS catalog import and its
  former host-allowlist secret are prohibited and removed.
- The nine Phase 4 Functions are active in `africa-south1`.
  `searchDeliveryAddresses` was redeployed and live-verified on 2026-07-28
  after enabling Places API (New) and accepting valid predictions without
  secondary text. Current Rules/indexes still require the final rollout
  evidence check before Phase 4 acceptance.
- FCM delivery, EAS production channels, and production configuration remain
  later-phase work. Development EAS projects are linked for both native apps.
- Paystack secret version `3` is expected to be the rotated test key, but this
  must be confirmed without printing it before Phase 4 deployment. Keep
  version `2` enabled for rollback until version `3` reconciles a successful
  test transaction.

## Configuration rules

Track `.env.example` files only. Keep actual `.env.local` files untracked.
Client Firebase identifiers may be exposed only through the app configuration
layer; Paystack secrets, webhook secrets, service credentials, and private keys
stay in Firebase-managed secret storage. Never put secrets in source, docs,
browser bundles, or logs.

`apps/customer-app/google-services.json` and
`apps/driver-app/google-services.json` are required local inputs but are
ignored and must not be staged. Their Firebase application IDs and Android
package names must match the corresponding `app.json`; one app must not borrow
the other app's package registration.

For EAS development and preview builds, each native app's `app.config.js`
resolves the EAS file variable `GOOGLE_SERVICES_JSON` when the builder provides
it and falls back to the local ignored file during local configuration. The
variable is configured only in each linked project's `development` environment
as a secret file; never print its contents or configure it for production.

Both native apps use `expo-updates` with the `appVersion` runtime policy and
their linked EAS `development` branch/channel. Publish a development OTA
update only after a successful Android export, and keep the update runtime at
the native app version.

From each native app directory, the development workflow is:

```sh
source /home/mmekwa/.nvm/nvm.sh
corepack pnpm dlx eas-cli build --profile development --platform android --wait
corepack pnpm dlx eas-cli update --branch development --message "<reviewed change>" --environment development --platform android
```

During development phases, owner-operated physical-device acceptance uses Expo
Go after compatibility and Android export checks pass. Self-contained internal
preview APKs are built only for the final Phase 7 quality-and-launch gate, from
each native app directory:

```sh
source /home/mmekwa/.nvm/nvm.sh
corepack pnpm dlx eas-cli build --profile preview --platform android --wait
```

The preview profile uses the development EAS environment but does not require
Metro or Expo Go when the installed app launches. It is not a Phase 4
acceptance requirement.

The EAS project and Firebase file secret must be configured before the build;
the OTA update cannot repair native build-time configuration such as missing
`google-services.json`.

## Local source baseline

- Tracked app-local `.env.example` files exist for all five apps; actual values
  are present only in ignored `.env.local` files.
- Customer App and Driver App target Expo SDK 57 and use the checked-in pnpm
  lockfile. `expo install --check`, Jest, TypeScript, and Android production
  export passed on 2026-07-21.
- Install dependencies only with `corepack pnpm install --frozen-lockfile`.

## Development-test data

Integration fixtures in the shared development project must include a unique
`testRunId`. Cleanup may remove only records and Auth UIDs created by that
exact run.

The Phase 2 live identity script creates random temporary Auth users and exact
tagged documents, deletes only their UIDs and tag, and fails if either Auth or
Firestore residue remains.

The Phase 3 live marketplace script extends that rule to temporary users,
stores, items, import batches/rows, audit records, and Storage objects. It
refuses any project/environment other than the named development project and
must finish with zero residue for its exact random `testRunId`.

The Phase 4 live checkout script additionally covers checkout sessions, orders,
payment/order events, notifications/outbox, fee rules, and delivery zones. It
restores the prior singleton platform settings in `finally`, deletes only
exact tagged records and generated Auth users, and verifies zero residue.
