import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  parsePaystackInitializeResponse,
  parsePaystackVerificationResponse,
  verifyPaystackSignature,
} from "./phase4-helpers";

describe("Phase 4 Paystack parsing", () => {
  it("parses the minimum hosted-checkout response", () => {
    expect(
      parsePaystackInitializeResponse({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/token",
          reference: "spc_checkout",
        },
      }),
    ).toEqual({
      authorizationUrl: "https://checkout.paystack.com/token",
      reference: "spc_checkout",
    });
  });

  it("parses verification and rejects amount omissions", () => {
    expect(
      parsePaystackVerificationResponse({
        status: true,
        data: {
          id: 42,
          reference: "spc_checkout",
          status: "success",
          amount: 12_345,
          currency: "zar",
        },
      }),
    ).toMatchObject({ amountMinor: 12_345, currency: "ZAR" });
    expect(() =>
      parsePaystackVerificationResponse({
        status: true,
        data: {
          id: 42,
          reference: "spc_checkout",
          status: "success",
          currency: "ZAR",
        },
      }),
    ).toThrow("omitted required");
  });

  it("accepts only the exact HMAC SHA512 signature", () => {
    const rawBody = Buffer.from('{"event":"charge.success"}');
    const secret = "sk_test_redacted";
    const valid = createHmac("sha512", secret).update(rawBody).digest("hex");
    expect(verifyPaystackSignature(rawBody, valid, secret)).toBe(true);
    expect(
      verifyPaystackSignature(rawBody, `${valid.slice(0, -1)}0`, secret),
    ).toBe(false);
    expect(verifyPaystackSignature(rawBody, undefined, secret)).toBe(false);
  });
});
