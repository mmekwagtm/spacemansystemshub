import type {
  CreateCheckoutSessionInput,
  PaystackPaymentAuthorization,
  PaystackPaymentVerification,
} from "@spaceman/app-types";

export function buildNativeCheckoutInput(input: {
  idempotencyKey: string;
  storeId: string;
  lines: CreateCheckoutSessionInput["lines"];
  placeId: string;
  sessionToken: string;
  label: string;
  instructions: string;
  testRunId?: string;
}): CreateCheckoutSessionInput {
  const instructions = input.instructions.trim();
  return {
    channel: "customer_app",
    idempotencyKey: input.idempotencyKey,
    storeId: input.storeId,
    lines: input.lines,
    addressSelection: {
      placeId: input.placeId,
      sessionToken: input.sessionToken,
      label: input.label.trim() || "Delivery address",
      ...(instructions ? { instructions } : {}),
    },
    ...(input.testRunId ? { testRunId: input.testRunId } : {}),
  };
}

export function shouldReconcilePaymentOnAppState(
  state: string,
  ownsPendingCheckout: boolean,
): boolean {
  return state === "active" && ownsPendingCheckout;
}

export async function launchNativeHostedPayment(input: {
  initialize(): Promise<PaystackPaymentAuthorization>;
  openUrl(url: string): Promise<unknown>;
  onOpened(authorization: PaystackPaymentAuthorization): void;
}): Promise<PaystackPaymentAuthorization> {
  const authorization = await input.initialize();
  await input.openUrl(authorization.authorizationUrl);
  input.onOpened(authorization);
  return authorization;
}

export function terminalPaymentNotice(
  result: PaystackPaymentVerification,
): string | undefined {
  if (result.status === "processing" || result.status === "paid")
    return undefined;
  if (result.status === "abandoned")
    return "Payment was abandoned. No order was created.";
  if (result.status === "cancelled")
    return "Payment was cancelled. No order was created.";
  return "Payment failed. No order was created.";
}
