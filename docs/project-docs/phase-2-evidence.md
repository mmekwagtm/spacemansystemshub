# Phase 2 Identity and Security Evidence

## Scope and environment

- Date: 2026-07-21
- Repository: `/home/mmekwa/Desktop/projects/spacemansystems`
- Firebase project: `spacemansystemsbackend` development only
- Region: `africa-south1`
- Runtime: Node.js 22, Corepack, pnpm 10.13.1
- No emulator or production environment was used.

## Development cloud state

- Email/password Firebase Authentication is enabled.
- Firestore and the default Firebase Storage bucket are in the development
  region.
- Firestore Rules and deny-all Storage Rules are released.
- `healthcheck`, `registerCustomerProfile`, `syncMyClaims`, `createStaffUser`,
  `updateUserStatus`, and `updateUserScope` are deployed as Generation 2
  callable Functions.
- Callable ingress reaches the Firebase Functions framework; Firebase Auth and
  the canonical server-side role/status/scope checks authorize each request.
- A seven-day Artifact Registry cleanup policy limits stale build artifacts.

## Automated and build evidence

- Shared identity/domain packages: type-check and unit tests passed.
- Firebase Functions: type-check, ESLint, Vitest, and bundled Node.js 22 build
  passed.
- Admin, Merchant, and Customer Web: unit tests and production builds passed.
- Playwright Chromium: all three web identity-boundary tests passed. An initial
  cold-run timeout and one ambiguous text locator were corrected in the test
  harness; neither was an application runtime defect.
- Customer App and Driver App: TypeScript, ESLint, Jest, Expo dependency check,
  and Android production export passed. Both exports bundled 1,276 modules and
  emitted a roughly 4.1 MB Hermes bundle.
- Owner evidence under `docs/live-test-data-docs/` records the current customer
  and staff identity journeys, status/role boundaries, and both Expo Go apps.

## Real Firebase identity matrix

Final exact test run: `phase2_identity_1784610317153_749c82ef`.

Passed cases:

- Customer Auth sign-up, trusted profile bootstrap, verification, sign-in, and
  own-profile read.
- Unverified-customer Function denial.
- Direct protected role write denial.
- Customer and Merchant attempts to create staff denied.
- Super-admin trusted Merchant and Driver invitation, scope update, and
  activation.
- Replayed `active` to `active` status transition denied.
- Cross-user profile, cross-store Merchant, and cross-assignment Driver reads
  denied.
- Suspended Merchant and archived Driver stale tokens denied immediately by
  both Functions and Firestore Rules.
- Direct Storage upload denied.
- All exact-tag Firestore documents, audit records, and temporary Firebase Auth
  users removed; the script's post-cleanup verification passed.

## Security decisions and future gates

- App Check enforcement remains off per `app-check.md` until web providers and
  native development-build attestation can be verified without client lockout.
- The Paystack test secret must be rotated before Phase 4. Its value is not
  reproduced in source or this evidence.
- Human Phase 2 acceptance passed across the three web clients and two Expo Go
  clients; redacted screenshots and terminal evidence are stored under
  `docs/live-test-data-docs/`.
- Production deployment is not authorized.

## Dirty-worktree report

The checkout was clean at Phase 2 start. Phase 2 implementation and live-test
evidence were reviewed and committed manually by the owner. Both
`google-services.json` files remain present locally and ignored after removal
from Git tracking. No production deployment was performed.
