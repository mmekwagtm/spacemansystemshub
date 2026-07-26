# Phase 3 native physical-device rerun — 2026-07-25

This checkpoint supersedes the 2026-07-24 result only for APK configuration
and launch. It does not supersede the remaining manual acceptance gaps.

Device: Samsung Galaxy Note9 (`SM-N960F`). Environment: self-contained
development EAS preview APKs launched without Metro or Expo Go.

| Client | Observed result | Status |
| --- | --- | --- |
| Customer App | Launched successfully, rendered `Marketplace foundation`, displayed cached/current development catalog records, showed a load-more control, reached an authenticated account state, and opened a store menu containing manual and CSV-backed items. | Partial pass |
| Driver App | Launched successfully, rendered `Delivery operations`, retained the Driver role and two delivery zones, exposed no marketplace controls, and returned to `Driver sign in` after sign-out. | Partial pass |

## Evidence handling

Four owner-provided phone captures were visually reviewed. They contain
test-account email addresses, so they are retained only in the ignored local
evidence directory and are not committed as final redacted evidence. No
password, API key, token, or Firebase configuration value is recorded here.

## Remaining native acceptance

- Customer: unambiguous guest journey, exercised pagination, offline refresh
  and cached fallback, session restoration, sign-out, and inactive/wrong-role
  denial.
- Driver: session restoration and inactive-user denial.
- Recapture only the missing states with emails and other identifiers redacted.

The native configuration crash is resolved, but the Phase 3 native/manual gate
remains incomplete.
