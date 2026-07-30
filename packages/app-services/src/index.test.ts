import type { CallableGateway } from "@spaceman/app-firebase";
import { describe, expect, it, vi } from "vitest";

import { createCheckoutService } from "./index";

describe("checkout service", () => {
  it("validates and routes checkout commands through the callable gateway", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "searchDeliveryAddresses") return [];
      return { checkoutSessionId: "checkout-1", status: "processing" };
    });
    const service = createCheckoutService(
      {
        checkoutSessions: { getById: vi.fn(async () => null) },
        orders: {
          getById: vi.fn(async () => null),
          listForCustomer: vi.fn(async () => ({ records: [] })),
        },
      } as never,
      { invoke } as unknown as CallableGateway,
    );

    await service.searchAddresses({
      storeId: "store-1",
      query: "Mabopane",
      sessionToken: "session_1234567890",
    });
    await service.verifyPayment({ checkoutSessionId: "checkout-1" });

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      "searchDeliveryAddresses",
      expect.objectContaining({ storeId: "store-1" }),
    );
    expect(invoke).toHaveBeenNthCalledWith(2, "verifyPaystackPayment", {
      checkoutSessionId: "checkout-1",
    });
  });

  it("rejects invalid checkout input before invoking Firebase", async () => {
    const invoke = vi.fn();
    const service = createCheckoutService(
      {
        checkoutSessions: { getById: vi.fn(async () => null) },
        orders: {
          getById: vi.fn(async () => null),
          listForCustomer: vi.fn(async () => ({ records: [] })),
        },
      } as never,
      { invoke } as unknown as CallableGateway,
    );

    expect(() =>
      service.searchAddresses({
        storeId: "store-1",
        query: "Ma",
        sessionToken: "short",
      }),
    ).toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
