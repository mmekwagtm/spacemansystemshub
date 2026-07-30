import type { PaystackPaymentAuthorization } from "@spaceman/app-types";

import {
  buildNativeCheckoutInput,
  launchNativeHostedPayment,
  shouldReconcilePaymentOnAppState,
  terminalPaymentNotice,
} from "./checkout-behavior";

const authorization: PaystackPaymentAuthorization = {
  checkoutSessionId: "checkout-1",
  reference: "spc_checkout-1",
  authorizationUrl: "https://checkout.paystack.com/token",
  quoteExpiresAt: "2099-01-01T00:00:00.000Z",
};

describe("native checkout behavior", () => {
  it("normalizes the authoritative quote input and propagates the exact test tag", () => {
    expect(
      buildNativeCheckoutInput({
        idempotencyKey: "checkout_1234567890",
        storeId: "store-1",
        lines: [{ itemId: "item-1", quantity: 2 }],
        placeId: "place-1",
        sessionToken: "session_1234567890",
        label: "  Home  ",
        instructions: "  Gate 4  ",
        testRunId: "phase4_note9_20260729_0002",
      }),
    ).toMatchObject({
      channel: "customer_app",
      addressSelection: {
        label: "Home",
        instructions: "Gate 4",
        sessionToken: "session_1234567890",
      },
      testRunId: "phase4_note9_20260729_0002",
    });
  });

  it("persists pending payment only after the hosted browser opens", async () => {
    const sequence: string[] = [];
    const result = await launchNativeHostedPayment({
      initialize: async () => authorization,
      openUrl: async () => {
        sequence.push("opened");
      },
      onOpened: () => sequence.push("persisted"),
    });

    expect(result).toBe(authorization);
    expect(sequence).toEqual(["opened", "persisted"]);
  });

  it("does not persist pending payment when Linking fails", async () => {
    const onOpened = jest.fn();
    await expect(
      launchNativeHostedPayment({
        initialize: async () => authorization,
        openUrl: async () => {
          throw new Error("browser unavailable");
        },
        onOpened,
      }),
    ).rejects.toThrow("browser unavailable");
    expect(onOpened).not.toHaveBeenCalled();
  });

  it("reconciles only an owned pending checkout when the app becomes active", () => {
    expect(shouldReconcilePaymentOnAppState("active", true)).toBe(true);
    expect(shouldReconcilePaymentOnAppState("background", true)).toBe(false);
    expect(shouldReconcilePaymentOnAppState("active", false)).toBe(false);
  });

  it.each([
    ["failed", "Payment failed. No order was created."],
    ["cancelled", "Payment was cancelled. No order was created."],
    ["abandoned", "Payment was abandoned. No order was created."],
  ] as const)("shows the %s terminal outcome", (status, message) => {
    expect(
      terminalPaymentNotice({
        checkoutSessionId: "checkout-1",
        status,
      }),
    ).toBe(message);
  });

  it("keeps delayed and successful payment states non-terminal", () => {
    expect(
      terminalPaymentNotice({
        checkoutSessionId: "checkout-1",
        status: "processing",
      }),
    ).toBeUndefined();
    expect(
      terminalPaymentNotice({
        checkoutSessionId: "checkout-1",
        status: "paid",
        orderId: "checkout-1",
      }),
    ).toBeUndefined();
  });
});
