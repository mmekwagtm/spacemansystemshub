import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError } from "@spaceman/app-errors";

function record(value: unknown, source: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({
      code: "provider_unavailable",
      source,
      message: "The provider returned an invalid response object.",
      userMessage: "The payment provider returned an invalid response.",
    });
  }
  return value as Record<string, unknown>;
}

export interface PaystackInitializeData {
  authorizationUrl: string;
  reference: string;
}

export function parsePaystackInitializeResponse(
  value: unknown,
): PaystackInitializeData {
  const response = record(value, "firebase-functions/paystack-initialize");
  const data = record(response.data, "firebase-functions/paystack-initialize");
  if (
    response.status !== true ||
    typeof data.authorization_url !== "string" ||
    typeof data.reference !== "string"
  ) {
    throw new AppError({
      code: "provider_unavailable",
      source: "firebase-functions/paystack-initialize",
      message: "Paystack initialization omitted required response fields.",
      userMessage: "Secure payment could not be opened. Please try again.",
    });
  }
  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

export interface PaystackVerificationData {
  transactionId: string;
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  paidAt?: string;
}

export function parsePaystackVerificationResponse(
  value: unknown,
): PaystackVerificationData {
  const response = record(value, "firebase-functions/paystack-verify");
  const data = record(response.data, "firebase-functions/paystack-verify");
  if (
    response.status !== true ||
    (typeof data.id !== "number" && typeof data.id !== "string") ||
    typeof data.reference !== "string" ||
    typeof data.status !== "string" ||
    typeof data.amount !== "number" ||
    !Number.isSafeInteger(data.amount) ||
    data.amount < 0 ||
    typeof data.currency !== "string"
  ) {
    throw new AppError({
      code: "provider_unavailable",
      source: "firebase-functions/paystack-verify",
      message: "Paystack verification omitted required response fields.",
      userMessage:
        "Payment status could not be confirmed. No order was created.",
    });
  }
  return {
    transactionId: String(data.id),
    reference: data.reference,
    status: data.status,
    amountMinor: data.amount,
    currency: data.currency.toUpperCase(),
    ...(typeof data.paid_at === "string" ? { paidAt: data.paid_at } : {}),
  };
}

export function verifyPaystackSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
