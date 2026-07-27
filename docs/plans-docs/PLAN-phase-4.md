# Phase 4 Plan: Maps, Checkout, and Payment

## Status

Phase 4 source and the complete local source gate pass. The nine development
Functions are active and Note9 address suggestions now pass, but final
Rules/index/IAM confirmation, self-cleaning live tests, Paystack test
transactions, Phase 3/Phase 4 owner Playwright acceptance, and Galaxy Note9
checkout acceptance remain gates. Phase 4 is not accepted until every exit
item below passes.

Overall accepted project progress remains **50%** while Phase 4 evidence is
incomplete. After every Phase 4 gate passes, Phase 4 becomes **100% accepted**
and overall accepted progress becomes **62.5%**.

## Scope

Phase 4 adds:

- A versioned, persisted, one-store Customer Web and Customer App cart.
- Server-side Places Autocomplete and Place Details address normalization,
  restricted to South Africa and configured Mabopane localities.
- Server-side Routes distance and duration with a snapshotted delivery fee.
- Admin delivery-zone, immutable fee-rule, and super-admin enable controls.
- Ten-minute, idempotent checkout quotes with authoritative catalog,
  store-hours, minimum-order, address, route, and fee revalidation.
- Hosted Paystack initialization, verification, signed webhook
  reconciliation, and a side-effect-free payment-return page.
- Exactly-once paid-order creation with payment, order, audit, notification,
  and outbox evidence.

No current-location permission, saved addresses, map rendering, refunds,
fulfillment UI, Driver tracking, App Check enforcement, production deployment,
or unrelated redesign is part of this phase.

## Provider decisions

Google Address Validation does not cover South Africa. Checkout therefore uses
Places Autocomplete and Place Details to resolve a selected ZA address, then
Routes `computeRoutes` for distance and duration. Both providers are called
only by trusted Functions with field masks, timeouts, and structured
fail-closed errors. No Maps key enters a client bundle.

Paystack uses hosted checkout. The backend derives the customer email, integer
minor-unit amount, ZAR currency, deterministic reference, and fixed HTTPS
return URL. A callback page cannot mark payment successful. Verification and
the signed webhook share the same transactional reconciler.

## Delivery-fee contract

The approved initial rule is:

| Input                 |    Value |
| --------------------- | -------: |
| Base fee              |   R20.00 |
| Included distance     |     3 km |
| Additional distance   | R4.00/km |
| Small-order threshold |  R100.00 |
| Small-order surcharge |   R10.00 |
| Minimum fee           |   R20.00 |
| Maximum fee           |   R80.00 |

Fractional minor units are rounded upward. The final fee is clamped to the
configured minimum and maximum. Every quote and order stores the complete
immutable rule version used for calculation.

## Trusted workflow

1. An authenticated, verified customer searches after three characters.
2. The server returns at most five ZA Places candidates for a Google session
   token.
3. Quote creation re-reads platform flags, store state, hours, minimum order,
   item availability and prices.
4. The server resolves the selected place, requires ZA and an exact configured
   locality, calculates one route, applies the active fee rule, and commits a
   ten-minute immutable quote only if the source fingerprint remains current.
5. Payment initialization rechecks flags and quote freshness, then asks
   Paystack for a hosted URL using the deterministic checkout reference.
6. Customer Web reconciles on window focus; Customer App reconciles on app
   resume. Both expose a manual **Check payment** fallback.
7. Paystack verification must match status, reference, amount, and ZAR
   currency.
8. One transaction creates `orders/{checkoutId}` at most once, appends
   evidence, creates merchant notification intent, and consumes the checkout.
9. Failed, abandoned, or still-processing payments update checkout/payment
   evidence only and never create an order.

Disabling new checkout or payment initialization must not remove the webhook;
already-initialized payments must remain reconcilable.

## Public commands and endpoints

Callable commands:

- `searchDeliveryAddresses`
- `createCheckoutSession`
- `upsertDeliveryZone`
- `publishDeliveryFeeRule`
- `updateCheckoutSettings`
- `initializePaystackPayment`
- `verifyPaystackPayment`

HTTP endpoints:

- `handlePaystackWebhook` — signed Paystack POST endpoint.
- `paystackPaymentReturn` — GET/HEAD informational return page with no state
  mutation.

## Data and security

- Checkout sessions and orders use schema version `1`, a customer channel,
  request hash, store/item/address/route/fee snapshots, provider reference,
  and resulting order ID.
- Delivery zones use ZA locality policy and an active fee-rule reference.
- Fee rules are immutable versions; publication supersedes the previous active
  version.
- Only staff may read fee rules, zones, and platform settings.
- Customers may read only their own checkout session and orders.
- All writes remain Function-only; cross-customer and direct client writes are
  denied.
- Development fixtures carry an exact `testRunId`. Cleanup covers checkout
  sessions, orders, payment/order events, notifications/outbox, audits, fee
  rules, and zones without broad deletion.

## Validation and rollout

Source validation includes fee boundaries/rounding, locality matching, expiry,
idempotency, opening hours, provider parsing, amount/currency/reference
mismatch, invalid signatures, replay behavior, cart persistence/replacement,
guest intent, unavailable items, address selection, quote expiry, hosted
provider launch, resume reconciliation, and offline blocking.

Development rollout is owner-operated:

1. Review and pass the complete local source gate.
2. Extend the existing server key restriction from Places to Places plus
   Routes without creating a client key.
3. Confirm Secret Manager version `3` is a rotated `sk_test_` key without
   printing it.
4. Deploy exact development Rules, indexes, and Phase 4 Functions.
5. Grant transport invocation only to the exact new callable/HTTP services.
6. Configure the Paystack test webhook.
7. Configure one active Mabopane zone, publish fee rule version 1, then enable
   customer ordering, Maps quotes, and new payments.
8. Run the self-cleaning development matrix and both unpaid/abandoned and
   successful test-payment paths.
9. Replay verification and the provider webhook; verify exactly one order.
10. Run Phase 3 Playwright regression and isolated Phase 4 Playwright.
11. Run Customer Web acceptance and Customer App Expo Go acceptance on the
    Galaxy Note9 after the Android compatibility/export gates pass.
12. Review redacted evidence and verify zero tagged Auth/Firestore residue.
13. Disable secret version `2` only after version `3` has reconciled a
    successful payment.

The 2026-07-27 Galaxy Note9 Expo Go smoke exposed an address-search failure.
On 2026-07-28 the server key was corrected for Places API (New), valid
predictions without secondary text were accepted, and the Note9 returned five
Mabopane suggestions. The full quote/payment/device workflow is still pending.
EAS preview-APK acceptance is outside Phase 4 and is deferred to the end of
Phase 7.

## Exit checklist

- [x] Shared cart, Maps, checkout, payment, repository, service, query, and
      validation source exists.
- [x] Admin Web, Customer Web, and Customer App interfaces exist.
- [x] Trusted Functions, Rules, indexes, return page, and exact cleanup source
      exist.
- [x] Focused shared, Functions, Admin, Customer Web, and Customer App tests
      pass.
- [x] Complete root validation passes after final source review.
- [ ] Phase 3 Playwright regression passes unchanged.
- [ ] Phase 4 development Rules, indexes, and Functions are deployed.
- [ ] Places plus Routes key restriction and Paystack test webhook are
      confirmed.
- [ ] Secret version `3` is confirmed as rotated test mode and reconciles a
      successful payment.
- [ ] Self-cleaning Maps/security/payment matrix passes with zero residue.
- [ ] Successful, failed/abandoned, repeat-verification, and webhook-replay
      evidence passes.
- [ ] Customer Web owner acceptance passes.
- [ ] Customer App passes Galaxy Note9 Expo Go acceptance without crashes or
      sensitive evidence after compatibility and Android export checks pass.
- [ ] The owner reviews redacted evidence and explicitly accepts Phase 4.

Production remains blocked until Phase 7 acceptance.
