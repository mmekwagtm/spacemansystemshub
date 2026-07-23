import { describe, expect, it } from "vitest";

import {
  catalogMediaSchema,
  catalogPageRequestSchema,
  createCheckoutSessionInputSchema,
  customerRegistrationInputSchema,
  openingHoursPeriodSchema,
  stageApiCatalogImportInputSchema,
  testFixtureMutationInputSchema,
  updateMerchantStoreInputSchema,
} from "./index";

describe("command validation", () => {
  it("accepts a bounded checkout request", () => {
    expect(
      createCheckoutSessionInputSchema.parse({
        storeId: "store-1",
        lines: [{ itemId: "item-1", quantity: 2 }],
        deliveryAddress: {
          label: "Home",
          formattedAddress: "Mabopane",
          coordinates: { latitude: -25.5, longitude: 28.1 },
        },
      }),
    ).toMatchObject({ storeId: "store-1" });
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

  it("accepts only bounded catalog images and HTTPS API sources", () => {
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
    expect(
      stageApiCatalogImportInputSchema.parse({
        storeId: "store-a",
        url: "https://catalog.example.com/items.json",
      }).url,
    ).toContain("https://");
    expect(() =>
      stageApiCatalogImportInputSchema.parse({
        storeId: "store-a",
        url: "http://catalog.example.com/items.json",
      }),
    ).toThrow();
  });
});
