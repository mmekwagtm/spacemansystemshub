# Architecture

## Current implementation state

This repository now contains the greenfield source implementation baseline for
Spaceman Projects: five application shells, shared package contracts, Firebase
Rules and Functions source, manual test harnesses, and deployment templates. It is
not a configured or deployed Firebase environment.

The native manifests target Expo SDK 57, but the local dependency installation
and lockfile have intentionally not been synchronized since that target was
restored. See [current-status.md](current-status.md) before treating native
validation or any runtime integration as complete. The authoritative decisions
are recorded in [architecture-decisions.md](architecture-decisions.md) and
[data-model.md](data-model.md).

## Flow

```text
Screen/Page -> Hook -> Query or Service -> Repository -> Firebase or Cloud Function
```

Screens and pages do not call Firebase directly. Services choose workflows,
repositories perform bounded data access, and Cloud Functions own trusted
server-side operations.

## Application boundaries

- Admin, Merchant, and Customer Web use Vite, React, and TypeScript.
- Customer and Driver apps use Expo Router and React Native.
- Apps share contracts and behavior through packages, not app-to-app imports or
  forced cross-platform components.
- A single real development Firebase project serves every app; production is
  not configured from this baseline.

## Shared package boundaries

The workspace contains `app-core`, `app-config`, `app-types`,
`app-errors`, `app-validation`, `app-firebase`, `app-database`,
`app-services`, `app-query`, `app-state`, `app-ui`, `app-maps`,
`app-notifications`, `app-functions`, and `shared`.

`firebase/functions` is the deployable runtime. `app-functions` stays pure and
platform-independent so trusted command contracts can be tested without Admin
SDK initialization.

## Order and security model

Orders are created only after verified Paystack payment. Checkout data belongs
to an expiring checkout session until verification. Payment state, fulfillment
state, assignment state, and needs-action reasons remain separate so a driver
can be assigned during preparation without corrupting the merchant lifecycle.

Roles, scope, payment truth, financial mutations, refunds, lifecycle changes,
and destructive cleanup are server-validated and audited.
