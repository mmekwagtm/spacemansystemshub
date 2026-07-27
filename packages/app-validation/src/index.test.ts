import { describe, expect, it } from "vitest";

import {
  catalogMediaSchema,
  catalogPageRequestSchema,
  createCheckoutSessionInputSchema,
  customerRegistrationInputSchema,
  openingHoursPeriodSchema,
  publishDeliveryFeeRuleInputSchema,
  searchDeliveryAddressesInputSchema,
  testFixtureMutationInputSchema,
  updateMerchantStoreInputSchema,
} from "./index";

describe("command validation", () => {
  it("accepts a bounded checkout request", () => {
    expect(
      createCheckoutSessionInputSchema.parse({
        channel: "customer_web",
        idempotencyKey: "checkout_1234567890",
        storeId: "store-1",
        lines: [{ itemId: "item-1", quantity: 2 }],
        addressSelection: {
          placeId: "place-1",
          sessionToken: "session_1234567890",
          label: "Home",
        },
      }),
    ).toMatchObject({ storeId: "store-1" });
  });

  it("bounds authenticated address search and fee configuration", () => {
    expect(
      searchDeliveryAddressesInputSchema.parse({
        storeId: "store-1",
        query: "Mab",
        sessionToken: "session_1234567890",
      }),
    ).toMatchObject({ query: "Mab" });
    expect(() =>
      searchDeliveryAddressesInputSchema.parse({
        storeId: "store-1",
        query: "Mabopane",
        sessionToken: "x".repeat(37),
      }),
    ).toThrow();
    expect(() =>
      publishDeliveryFeeRuleInputSchema.parse({
        deliveryZoneId: "mabopane",
        name: "Invalid clamp",
        deliveryType: "standard",
        baseFee: { amountMinor: 2_000, currency: "ZAR" },
        includedDistanceMetres: 3_000,
        perKilometreFee: { amountMinor: 400, currency: "ZAR" },
        smallOrderThreshold: { amountMinor: 10_000, currency: "ZAR" },
        smallOrderSurcharge: { amountMinor: 1_000, currency: "ZAR" },
        minimumFee: { amountMinor: 8_001, currency: "ZAR" },
        maximumFee: { amountMinor: 8_000, currency: "ZAR" },
        effectiveFrom: "2026-07-26T00:00:00.000Z",
      }),
    ).toThrow("Maximum fee");
  });

  it("rejects fixture cleanup without a scoped test run", () => {
    expect(() =>
      testFixtureMutationInputSchema.parse({ testRunId: "short" }),
    ).toThrow();
  });

  it("normalizes valid customer registration and rejects a weak password", () => {
    expect(
      customerRegistrationInputSchema.parse({
        email: " Customer@Example.com ",
        password: "correct-horse",
        displayName: "Customer",
      }).email,
    ).toBe("customer@example.com");

    expect(() =>
      customerRegistrationInputSchema.parse({
        email: "customer@example.com",
        password: "short",
        displayName: "Customer",
      }),
    ).toThrow();
  });

  it("bounds marketplace pagination and normalizes search", () => {
    expect(
      catalogPageRequestSchema.parse({ limit: 50, search: "  Fresh   FOOD " }),
    ).toEqual({
      limit: 50,
      search: "fresh food",
    });
    expect(() => catalogPageRequestSchema.parse({ limit: 51 })).toThrow();
  });

  it("requires complete opening hours for an open day", () => {
    expect(
      openingHoursPeriodSchema.parse({
        day: 1,
        closed: false,
        opensAt: "08:00",
        closesAt: "17:00",
      }),
    ).toMatchObject({ day: 1, closed: false });
    expect(() =>
      openingHoursPeriodSchema.parse({ day: 1, closed: false }),
    ).toThrow();
  });

  it("allows scoped merchant presentation updates without protected address data", () => {
    const result = updateMerchantStoreInputSchema.parse({
      storeId: "store-a",
      name: "Scoped store",
      category: "Restaurant",
      description: "Merchant-controlled presentation.",
      openingHours: [],
      openForOrders: true,
      minimumOrder: { amountMinor: 2_000, currency: "ZAR" },
      address: {
        label: "Attempted protected change",
        formattedAddress: "Must not pass through",
        coordinates: { latitude: -25.5, longitude: 28.1 },
      },
    });

    expect(result.storeId).toBe("store-a");
    expect(result).not.toHaveProperty("address");
  });

  it("accepts only bounded catalog images", () => {
    expect(
      catalogMediaSchema.parse({
        sourcePath: "catalog/store-a/staging/user/asset/source.webp",
        thumbnailPath: "catalog/store-a/staging/user/asset/thumbnail.webp",
        altText: "A plated development meal",
        contentType: "image/webp",
        sizeBytes: 250_000,
      }).contentType,
    ).toBe("image/webp");
    expect(() =>
      catalogMediaSchema.parse({
        sourcePath: "source",
        thumbnailPath: "thumbnail",
        altText: "Oversized",
        contentType: "image/jpeg",
        sizeBytes: 5_000_001,
      }),
    ).toThrow();
  });
});
