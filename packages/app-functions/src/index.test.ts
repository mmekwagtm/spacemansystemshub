import { describe, expect, it } from "vitest";

import {
  assertAccountArchiveTarget,
  assertAssignmentVersion,
  assertFeeRuleEffectiveNow,
  assertCatalogMediaScope,
  assertForegroundLocationEligibility,
  assertFulfillmentTransition,
  assertPaystackVerification,
  assertQuoteFresh,
  assertRefundReviewAllowed,
  assertStoreScope,
  assertTrustedCommandAccess,
  assertUserManagementScope,
  assertUserStatusTransition,
  isStoreOpenAt,
  needsActionReasonsAfterAssignment,
  requirePaystackAuthorizationUrl,
  requirePaystackSecretForEnvironment,
  decideMerchantStoreSubmissionAction,
  decideCatalogImportCommit,
  decidePaystackWebhookAction,
  hasUsableOpeningHours,
  stableCatalogImportItemId,
  stableCheckoutSessionId,
  stablePaystackReference,
} from "./index";

describe("trusted command policy", () => {
  it("derives assignment action reasons without stale no-driver state", () => {
    expect(
      needsActionReasonsAfterAssignment([
        "no_driver_assigned",
        "refund_review",
        "refund_review",
      ]),
    ).toEqual(["refund_review"]);
    expect(needsActionReasonsAfterAssignment(["no_driver_assigned"])).toEqual([
      "none",
    ]);
  });

  it("rejects future fee-rule activation", () => {
    expect(() =>
      assertFeeRuleEffectiveNow(
        "2026-07-29T00:00:00.000Z",
        new Date("2026-07-28T00:00:00.000Z"),
      ),
    ).toThrow("current effective date");
    expect(() =>
      assertFeeRuleEffectiveNow(
        "2026-07-27T00:00:00.000Z",
        new Date("2026-07-28T00:00:00.000Z"),
      ),
    ).not.toThrow();
  });

  it("keeps staff creation exclusive to super administrators", () => {
    expect(() =>
      assertTrustedCommandAccess("createStaffUser", "admin"),
    ).toThrow();
    expect(() =>
      assertTrustedCommandAccess("createStaffUser", "super_admin"),
    ).not.toThrow();
  });

  it("separates merchant submissions from administrative publication", () => {
    expect(() =>
      assertTrustedCommandAccess("submitMerchantStore", "merchant"),
    ).not.toThrow();
    expect(() =>
      assertTrustedCommandAccess("reviewStoreSubmission", "merchant"),
    ).toThrow();
    expect(() =>
      assertTrustedCommandAccess("upsertStore", "merchant"),
    ).toThrow();
    expect(() =>
      assertTrustedCommandAccess("retireCatalogItem", "merchant"),
    ).toThrow();
  });

  it("keeps import replay idempotent and stable per selected row", () => {
    expect(decideCatalogImportCommit("ready")).toBe("apply");
    expect(decideCatalogImportCommit("applied")).toBe("replay");
    expect(() => decideCatalogImportCommit("applying")).toThrow();
    expect(stableCatalogImportItemId("batch-1", "row-1")).toBe(
      stableCatalogImportItemId("batch-1", "row-1"),
    );
    expect(stableCatalogImportItemId("batch-1", "row-1")).not.toBe(
      stableCatalogImportItemId("batch-1", "row-2"),
    );
  });

  it("rejects media metadata borrowed from another store", () => {
    expect(() =>
      assertCatalogMediaScope("store-a", {
        sourcePath: "catalog/store-a/staging/user/asset/source.webp",
        thumbnailPath: "catalog/store-a/staging/user/asset/thumbnail.webp",
      }),
    ).not.toThrow();
    expect(() =>
      assertCatalogMediaScope("store-a", {
        sourcePath: "catalog/store-b/staging/user/asset/source.webp",
        thumbnailPath: "catalog/store-b/staging/user/asset/thumbnail.webp",
      }),
    ).toThrow();
  });

  it("allows the driver delivery handoff only after pickup readiness", () => {
    expect(() =>
      assertFulfillmentTransition("driver", "ready_for_pickup", "on_the_way"),
    ).not.toThrow();
    expect(() =>
      assertFulfillmentTransition("driver", "paid", "confirmed"),
    ).toThrow();
  });

  it("prevents assignment races", () => {
    expect(() => assertAssignmentVersion(1, 2)).toThrow();
  });

  it("enforces merchant store and staff hierarchy boundaries", () => {
    expect(() =>
      assertStoreScope("merchant", ["store-a"], "store-b"),
    ).toThrow();
    expect(() => assertUserManagementScope("admin", "admin")).toThrow();
    expect(() =>
      assertUserManagementScope("super_admin", "admin"),
    ).not.toThrow();
  });

  it("allows only the owner to update pending or resubmit rejected drafts", () => {
    expect(
      decideMerchantStoreSubmissionAction({
        exists: false,
        actorId: "merchant-1",
      }),
    ).toBe("create");
    expect(
      decideMerchantStoreSubmissionAction({
        exists: true,
        actorId: "merchant-1",
        merchantId: "merchant-1",
        status: "draft",
        approvalState: "pending",
      }),
    ).toBe("update_pending");
    expect(
      decideMerchantStoreSubmissionAction({
        exists: true,
        actorId: "merchant-1",
        merchantId: "merchant-1",
        status: "draft",
        approvalState: "rejected",
      }),
    ).toBe("resubmit_rejected");
    expect(() =>
      decideMerchantStoreSubmissionAction({
        exists: true,
        actorId: "merchant-1",
        merchantId: "merchant-2",
        status: "draft",
        approvalState: "rejected",
      }),
    ).toThrow();
    expect(() =>
      decideMerchantStoreSubmissionAction({
        exists: true,
        actorId: "merchant-1",
        merchantId: "merchant-1",
        status: "active",
        approvalState: "approved",
      }),
    ).toThrow();
  });

  it("rejects replayed and terminal user-status changes", () => {
    expect(() => assertUserStatusTransition("invited", "active")).not.toThrow();
    expect(() => assertUserStatusTransition("active", "active")).toThrow();
    expect(() => assertUserStatusTransition("archived", "active")).toThrow();
  });

  it("creates a paid order once and treats a signed webhook retry as a replay", () => {
    expect(
      decidePaystackWebhookAction({
        event: "charge.success",
        eventAlreadyProcessed: false,
        checkoutSessionStatus: "payment_pending",
      }),
    ).toBe("create_order");
    expect(
      decidePaystackWebhookAction({
        event: "charge.success",
        eventAlreadyProcessed: true,
      }),
    ).toBe("replay");
    expect(
      decidePaystackWebhookAction({
        event: "charge.failed",
        eventAlreadyProcessed: false,
      }),
    ).toBe("ignore");
  });

  it("stops foreground tracking when a delivery is no longer active", () => {
    expect(() =>
      assertForegroundLocationEligibility("driver-1", "driver-1", "on_the_way"),
    ).not.toThrow();
    expect(() =>
      assertForegroundLocationEligibility("driver-1", "driver-1", "delivered"),
    ).toThrow();
    expect(() =>
      assertForegroundLocationEligibility("driver-1", "driver-2", "on_the_way"),
    ).toThrow();
  });

  it("keeps refund review within the verified paid total", () => {
    expect(() =>
      assertRefundReviewAllowed({
        paymentStatus: "paid",
        refundStatus: "not_requested",
        totalAmountMinor: 12_345,
        requestedAmountMinor: 12_345,
      }),
    ).not.toThrow();
    expect(() =>
      assertRefundReviewAllowed({
        paymentStatus: "paid",
        refundStatus: "not_requested",
        totalAmountMinor: 12_345,
        requestedAmountMinor: 12_346,
      }),
    ).toThrow();
  });

  it("prevents an administrator from archiving their own account", () => {
    expect(() => assertAccountArchiveTarget("admin-1", "admin-1")).toThrow();
    expect(() =>
      assertAccountArchiveTarget("admin-1", "customer-1"),
    ).not.toThrow();
  });
});

describe("Phase 4 checkout and payment invariants", () => {
  it("uses stable checkout and provider references", () => {
    const first = stableCheckoutSessionId("customer", "key_1234567890123456");
    const replay = stableCheckoutSessionId("customer", "key_1234567890123456");
    expect(replay).toBe(first);
    expect(stablePaystackReference(first)).toBe(`spc_${first}`);
  });

  it("rejects expired quotes", () => {
    expect(() =>
      assertQuoteFresh(
        "2026-07-26T10:00:00.000Z",
        new Date("2026-07-26T10:00:01.000Z"),
      ),
    ).toThrow("expired");
  });

  it("verifies Paystack reference, amount, currency and status", () => {
    expect(
      assertPaystackVerification({
        expectedReference: "spc_checkout",
        expectedAmountMinor: 12_345,
        expectedCurrency: "ZAR",
        providerReference: "spc_checkout",
        providerAmountMinor: 12_345,
        providerCurrency: "ZAR",
        providerStatus: "success",
      }),
    ).toBe("paid");
    expect(() =>
      assertPaystackVerification({
        expectedReference: "spc_checkout",
        expectedAmountMinor: 12_345,
        expectedCurrency: "ZAR",
        providerReference: "spc_checkout",
        providerAmountMinor: 12_344,
        providerCurrency: "ZAR",
        providerStatus: "success",
      }),
    ).toThrow("did not match");
  });

  it("accepts only the hosted Paystack checkout host", () => {
    expect(
      requirePaystackAuthorizationUrl(
        "https://checkout.paystack.com/secure-token",
      ),
    ).toContain("checkout.paystack.com");
    expect(() =>
      requirePaystackAuthorizationUrl("https://example.com/phish"),
    ).toThrow("unapproved");
  });

  it("rejects live Paystack keys in development without exposing the key", () => {
    expect(() =>
      requirePaystackSecretForEnvironment("sk_live_redacted", "development"),
    ).toThrow("rejects non-test");
    expect(
      requirePaystackSecretForEnvironment("sk_test_redacted", "development"),
    ).toBe("sk_test_redacted");
  });

  it("evaluates normal and overnight Johannesburg opening hours", () => {
    const sunday = [{ day: 0 as const, closed: false, opensAt: "08:00", closesAt: "18:00" }];
    expect(hasUsableOpeningHours([])).toBe(false);
    expect(hasUsableOpeningHours([...sunday, ...sunday])).toBe(false);
    expect(
      isStoreOpenAt(
        sunday,
        new Date("2026-07-26T10:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isStoreOpenAt(
        [{ day: 6, closed: false, opensAt: "20:00", closesAt: "02:00" }],
        new Date("2026-07-25T23:30:00.000Z"),
      ),
    ).toBe(true);
  });
});
