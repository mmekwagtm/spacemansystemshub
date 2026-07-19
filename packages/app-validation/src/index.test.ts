import { describe, expect, it } from "vitest";

import { createCheckoutSessionInputSchema, testFixtureMutationInputSchema } from "./index";

describe("command validation", () => {
  it("accepts a bounded checkout request", () => {
    expect(
      createCheckoutSessionInputSchema.parse({
        storeId: "store-1",
        lines: [{ itemId: "item-1", quantity: 2 }],
        deliveryAddress: {
          label: "Home",
          formattedAddress: "Mabopane",
          coordinates: { latitude: -25.5, longitude: 28.1 }
        }
      })
    ).toMatchObject({ storeId: "store-1" });
  });

  it("rejects fixture cleanup without a scoped test run", () => {
    expect(() => testFixtureMutationInputSchema.parse({ testRunId: "short" })).toThrow();
  });
});
