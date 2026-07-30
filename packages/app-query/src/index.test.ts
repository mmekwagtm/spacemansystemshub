import { describe, expect, it } from "vitest";

import { queryKeys } from "./index";

describe("query keys", () => {
  it("keeps checkout, order, zone, and fee caches isolated", () => {
    expect(queryKeys.checkoutSession("checkout-1")).toEqual([
      "checkout-session",
      "checkout-1",
    ]);
    expect(queryKeys.customerOrders("customer-1")).toEqual([
      "customer-orders",
      "customer-1",
    ]);
    expect(queryKeys.deliveryZones()).toEqual(["delivery-zones"]);
    expect(queryKeys.feeRules("zone-1")).toEqual(["fee-rules", "zone-1"]);
  });
});
