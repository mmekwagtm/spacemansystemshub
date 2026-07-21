import { describe, expect, it } from "vitest";

import {
  createCheckoutSessionInputSchema,
  customerRegistrationInputSchema,
  testFixtureMutationInputSchema
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
          coordinates: { latitude: -25.5, longitude: 28.1 }
        }
      })
    ).toMatchObject({ storeId: "store-1" });
  });

  it("rejects fixture cleanup without a scoped test run", () => {
    expect(() => testFixtureMutationInputSchema.parse({ testRunId: "short" })).toThrow();
  });

  it("normalizes valid customer registration and rejects a weak password", () => {
    expect(customerRegistrationInputSchema.parse({
      email: " Customer@Example.com ",
      password: "correct-horse",
      displayName: "Customer"
    }).email).toBe("customer@example.com");

    expect(() => customerRegistrationInputSchema.parse({
      email: "customer@example.com",
      password: "short",
      displayName: "Customer"
    })).toThrow();
  });
});
