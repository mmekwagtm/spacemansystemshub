import { describe, expect, it } from "vitest";

import { canTransitionFulfillment, formatMoney, isTerminalFulfillmentStatus } from "./index";

describe("fulfillment status contract", () => {
  it("allows the paid-to-confirmed transition", () => {
    expect(canTransitionFulfillment("paid", "confirmed")).toBe(true);
  });

  it("does not treat a delivery as reversible", () => {
    expect(canTransitionFulfillment("delivered", "on_the_way")).toBe(false);
    expect(isTerminalFulfillmentStatus("delivered")).toBe(true);
  });

  it("formats ZAR minor amounts without floating-point business logic", () => {
    expect(formatMoney(12345, "ZAR", "en-US")).toContain("123.45");
  });
});
