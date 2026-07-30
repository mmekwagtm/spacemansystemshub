import type { CheckoutFeeRuleSnapshot } from "@spaceman/app-types";
import { describe, expect, it } from "vitest";

import {
  assertWithinMaximumDeliveryDistance,
  calculateDeliveryFeeMinor,
  feePolicyFromSnapshot,
  matchesAllowedLocality,
  parseGoogleDurationSeconds,
  ProviderRequestGate,
  requireVerifiedServiceability,
} from "./index";

const policy = {
  baseFeeMinor: 2_000,
  includedDistanceMetres: 3_000,
  perKilometreFeeMinor: 400,
  smallOrderThresholdMinor: 10_000,
  smallOrderSurchargeMinor: 1_000,
  minimumFeeMinor: 2_000,
  maximumFeeMinor: 8_000,
};

describe("Phase 4 delivery fees", () => {
  it("applies the small-order surcharge inside the included distance", () => {
    expect(
      calculateDeliveryFeeMinor({
        distanceMetres: 3_000,
        itemSubtotalMinor: 9_999,
        policy,
      }),
    ).toBe(3_000);
  });

  it("rounds fractional cents upward", () => {
    expect(
      calculateDeliveryFeeMinor({
        distanceMetres: 3_001,
        itemSubtotalMinor: 10_000,
        policy,
      }),
    ).toBe(2_001);
  });

  it("does not surcharge an order exactly at the threshold", () => {
    expect(
      calculateDeliveryFeeMinor({
        distanceMetres: 3_000,
        itemSubtotalMinor: 10_000,
        policy,
      }),
    ).toBe(2_000);
  });

  it("clamps the fee to the approved maximum", () => {
    expect(
      calculateDeliveryFeeMinor({
        distanceMetres: 100_000,
        itemSubtotalMinor: 10_000,
        policy,
      }),
    ).toBe(8_000);
  });

  it("clamps a below-base policy result to the configured minimum", () => {
    expect(
      calculateDeliveryFeeMinor({
        distanceMetres: 0,
        itemSubtotalMinor: 10_000,
        policy: { ...policy, baseFeeMinor: 0 },
      }),
    ).toBe(2_000);
  });

  it("builds the calculation policy from an immutable snapshot", () => {
    const money = (amountMinor: number) =>
      ({ amountMinor, currency: "ZAR" }) as const;
    const snapshot: CheckoutFeeRuleSnapshot = {
      id: "rule-v1",
      deliveryZoneId: "mabopane",
      version: 1,
      name: "Mabopane standard",
      deliveryType: "standard",
      currency: "ZAR",
      baseFee: money(2_000),
      includedDistanceMetres: 3_000,
      perKilometreFee: money(400),
      smallOrderThreshold: money(10_000),
      smallOrderSurcharge: money(1_000),
      minimumFee: money(2_000),
      maximumFee: money(8_000),
      effectiveFrom: "2026-07-26T00:00:00.000Z",
    };
    expect(feePolicyFromSnapshot(snapshot)).toEqual(policy);
  });
});

describe("Phase 4 Maps guards", () => {
  it("preserves unlimited legacy zones and enforces a configured maximum", () => {
    expect(() =>
      assertWithinMaximumDeliveryDistance(250_000),
    ).not.toThrow();
    expect(() =>
      assertWithinMaximumDeliveryDistance(7_391, 10_000),
    ).not.toThrow();
    expect(() =>
      assertWithinMaximumDeliveryDistance(10_001, 10_000),
    ).toThrow("exceeds the configured maximum delivery distance");
  });

  it("caches duplicate provider work inside one actor session", async () => {
    const gate = new ProviderRequestGate({
      limit: 2,
      windowMs: 60_000,
      cacheTtlMs: 10_000,
    });
    let calls = 0;
    const load = async () => {
      calls += 1;
      return ["result"];
    };

    await expect(
      gate.run({ actorId: "customer-1", cacheKey: "session:query" }, load),
    ).resolves.toEqual(["result"]);
    await expect(
      gate.run({ actorId: "customer-1", cacheKey: "session:query" }, load),
    ).resolves.toEqual(["result"]);
    expect(calls).toBe(1);
  });

  it("limits provider-bound calls and resets after the window", async () => {
    let now = 1_000;
    const gate = new ProviderRequestGate(
      { limit: 1, windowMs: 1_000, cacheTtlMs: 0 },
      () => now,
    );
    await gate.run({ actorId: "customer-1" }, async () => "first");
    await expect(
      gate.run({ actorId: "customer-1" }, async () => "blocked"),
    ).rejects.toThrow("bounded provider request window");
    now += 1_000;
    await expect(
      gate.run({ actorId: "customer-1" }, async () => "second"),
    ).resolves.toBe("second");
  });

  it("enforces one shared quota across independent provider gates", async () => {
    let calls = 0;
    const distributedQuota = {
      consume: async () => {
        if (calls >= 1) throw new Error("distributed quota reached");
        calls += 1;
      },
    };
    const firstInstance = new ProviderRequestGate(
      { limit: 1, windowMs: 1_000, cacheTtlMs: 0 },
      () => 1_000,
      distributedQuota,
    );
    const secondInstance = new ProviderRequestGate(
      { limit: 1, windowMs: 1_000, cacheTtlMs: 0 },
      () => 1_000,
      distributedQuota,
    );
    await expect(
      firstInstance.run({ actorId: "customer-1" }, async () => "first"),
    ).resolves.toBe("first");
    await expect(
      secondInstance.run({ actorId: "customer-1" }, async () => "not-called"),
    ).rejects.toThrow("distributed quota reached");
  });

  it("matches normalized Mabopane locality components", () => {
    expect(
      matchesAllowedLocality(
        ["Mabopane Unit A", "Mabopane", "City of Tshwane"],
        ["mabopane"],
      ),
    ).toBe(true);
    expect(matchesAllowedLocality(["Soshanguve"], ["Mabopane"])).toBe(false);
  });

  it("parses and rounds a Google duration", () => {
    expect(parseGoogleDurationSeconds("165.2s")).toBe(166);
  });

  it("rejects expired quotes", () => {
    expect(() =>
      requireVerifiedServiceability(
        {
          deliveryAddress: {
            label: "Home",
            formattedAddress: "Mabopane, South Africa",
            coordinates: { latitude: -25.5, longitude: 28.0 },
            placeId: "place",
            countryCode: "ZA",
            locality: "Mabopane",
          },
          routeSnapshot: {
            provider: "google_routes",
            deliveryZoneId: "mabopane",
            serviceAreaVersion: 1,
            distanceMetres: 3_000,
            durationSeconds: 600,
            calculatedAt: "2026-07-26T00:00:00.000Z",
          },
          feeRuleSnapshot: {
            id: "rule-v1",
            deliveryZoneId: "mabopane",
            version: 1,
            name: "Mabopane standard",
            deliveryType: "standard",
            currency: "ZAR",
            baseFee: { amountMinor: 2_000, currency: "ZAR" },
            includedDistanceMetres: 3_000,
            perKilometreFee: { amountMinor: 400, currency: "ZAR" },
            smallOrderThreshold: { amountMinor: 10_000, currency: "ZAR" },
            smallOrderSurcharge: { amountMinor: 1_000, currency: "ZAR" },
            minimumFee: { amountMinor: 2_000, currency: "ZAR" },
            maximumFee: { amountMinor: 8_000, currency: "ZAR" },
            effectiveFrom: "2026-07-26T00:00:00.000Z",
          },
          deliveryFee: { amountMinor: 2_000, currency: "ZAR" },
          verifiedAt: "2026-07-26T00:00:00.000Z",
          expiresAt: "2026-07-26T00:10:00.000Z",
        },
        new Date("2026-07-26T00:11:00.000Z"),
      ),
    ).toThrow("valid maps-backed delivery fee");
  });
});
