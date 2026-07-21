import { APP_ROLES, canTransitionFulfillment, canTransitionUserStatus } from "@spaceman/app-core";
import type { AppRole, FulfillmentStatus, UserStatus } from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import { testRunIdSchema } from "@spaceman/app-validation";

export const TRUSTED_COMMANDS = [
  "registerCustomerProfile",
  "syncMyClaims",
  "createStaffUser",
  "updateUserStatus",
  "updateUserScope",
  "upsertStore",
  "upsertItem",
  "retireCatalogItem",
  "createCheckoutSession",
  "verifyPaystackPayment",
  "handlePaystackWebhook",
  "transitionMerchantFulfillment",
  "assignDriver",
  "updateDriverLocation",
  "createActivity",
  "requestRefund",
  "archiveOrRedactAccount",
  "seedTestFixtures",
  "cleanupTestFixtures"
] as const;
export type TrustedCommand = (typeof TRUSTED_COMMANDS)[number];

const commandRoles: Readonly<Record<TrustedCommand, readonly AppRole[]>> = {
  registerCustomerProfile: ["customer"],
  syncMyClaims: APP_ROLES,
  createStaffUser: ["super_admin"],
  updateUserStatus: ["admin", "super_admin"],
  updateUserScope: ["admin", "super_admin"],
  upsertStore: ["merchant", "admin", "super_admin"],
  upsertItem: ["merchant", "admin", "super_admin"],
  retireCatalogItem: ["merchant", "admin", "super_admin"],
  createCheckoutSession: ["customer"],
  verifyPaystackPayment: ["super_admin"],
  handlePaystackWebhook: ["super_admin"],
  transitionMerchantFulfillment: ["merchant", "admin", "super_admin"],
  assignDriver: ["admin", "super_admin"],
  updateDriverLocation: ["driver"],
  createActivity: ["admin", "super_admin"],
  requestRefund: ["admin", "super_admin"],
  archiveOrRedactAccount: ["admin", "super_admin"],
  seedTestFixtures: ["super_admin"],
  cleanupTestFixtures: ["super_admin"]
};

export function assertTrustedCommandAccess(command: TrustedCommand, role: AppRole): void {
  if (!commandRoles[command].includes(role)) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/command-policy",
      message: `Role ${role} cannot execute ${command}.`,
      userMessage: "You do not have permission to complete that action."
    });
  }
}

export function assertFulfillmentTransition(
  role: AppRole,
  from: FulfillmentStatus,
  to: FulfillmentStatus
): void {
  if (!canTransitionFulfillment(from, to)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/fulfillment-transition",
      message: `The transition from ${from} to ${to} is not allowed.`,
      userMessage: "This order can no longer move to that status."
    });
  }

  const merchantTransition = ["paid", "confirmed", "preparing"].includes(from)
    && ["confirmed", "preparing", "ready_for_pickup"].includes(to);
  const driverTransition = from === "ready_for_pickup" && to === "on_the_way"
    || from === "on_the_way" && to === "delivered";
  const staffTransition = APP_ROLES.includes(role) && (role === "admin" || role === "super_admin");

  if ((role === "merchant" && merchantTransition) || (role === "driver" && driverTransition) || staffTransition) {
    return;
  }

  throw new AppError({
    code: "authorization_denied",
    source: "app-functions/fulfillment-transition",
    message: `Role ${role} cannot move ${from} to ${to}.`,
    userMessage: "You do not have permission to update this order status."
  });
}

export function assertAssignmentVersion(expectedVersion: number, currentVersion: number): void {
  if (expectedVersion !== currentVersion) {
    throw new AppError({
      code: "conflict",
      source: "app-functions/driver-assignment",
      message: "Driver assignment version does not match the current assignment.",
      userMessage: "This order was updated by another dispatcher. Refresh and try again.",
      debug: { expectedVersion, currentVersion }
    });
  }
}

export function assertStoreScope(role: AppRole, storeIds: readonly string[], storeId: string): void {
  if (role === "merchant" && !storeIds.includes(storeId)) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/store-scope",
      message: `Merchant scope does not include store ${storeId}.`,
      userMessage: "You do not have access to that store."
    });
  }
}

export function assertUserManagementScope(actorRole: AppRole, targetRole: AppRole): void {
  const canManageTarget = actorRole === "super_admin" || (
    actorRole === "admin" && targetRole !== "admin" && targetRole !== "super_admin"
  );

  if (!canManageTarget) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/user-management",
      message: `Role ${actorRole} cannot manage a ${targetRole} account.`,
      userMessage: "You do not have permission to manage that account."
    });
  }
}

export function assertUserStatusTransition(from: UserStatus, to: UserStatus): void {
  if (!canTransitionUserStatus(from, to)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/user-status-transition",
      message: `User status cannot transition from ${from} to ${to}.`,
      userMessage: "That account status change is not allowed. Refresh and try again."
    });
  }
}

export type PaystackWebhookAction = "ignore" | "replay" | "create_order";

export function decidePaystackWebhookAction(input: {
  event: string;
  eventAlreadyProcessed: boolean;
  checkoutSessionStatus?: string;
}): PaystackWebhookAction {
  if (input.event !== "charge.success") {
    return "ignore";
  }
  if (input.eventAlreadyProcessed) {
    return "replay";
  }
  if (
    input.checkoutSessionStatus !== "payment_pending"
    && input.checkoutSessionStatus !== "payment_initialized"
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/payment-webhook",
      message: "The checkout session is not ready for payment confirmation.",
      userMessage: "This payment cannot be confirmed for the current checkout session."
    });
  }

  return "create_order";
}

export function assertForegroundLocationEligibility(
  actorId: string,
  assignedDriverId: unknown,
  fulfillmentStatus: unknown
): void {
  if (assignedDriverId !== actorId || fulfillmentStatus !== "on_the_way") {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/driver-location",
      message: "Foreground location updates require the assigned driver and an active delivery.",
      userMessage: "Location sharing is allowed only for your active delivery."
    });
  }
}

export function assertRefundReviewAllowed(input: {
  paymentStatus: unknown;
  refundStatus: unknown;
  totalAmountMinor: number;
  requestedAmountMinor: number;
}): void {
  if (!Number.isSafeInteger(input.totalAmountMinor) || input.totalAmountMinor <= 0) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "The order total is invalid for a refund review.",
      userMessage: "This order cannot be refunded because its payment total is invalid."
    });
  }
  if (!Number.isSafeInteger(input.requestedAmountMinor) || input.requestedAmountMinor <= 0) {
    throw new AppError({
      code: "invalid_input",
      source: "app-functions/refund-review",
      message: "The requested refund amount must be a positive integer minor amount.",
      userMessage: "Enter a valid refund amount."
    });
  }
  if (input.paymentStatus !== "paid" && input.paymentStatus !== "partially_refunded") {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "Only paid orders can enter refund review.",
      userMessage: "Only a paid order can be refunded."
    });
  }
  if (input.refundStatus === "processing" || input.refundStatus === "completed") {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "A refund is already being processed for this order.",
      userMessage: "A refund is already in progress for this order."
    });
  }
  if (input.requestedAmountMinor > input.totalAmountMinor) {
    throw new AppError({
      code: "invalid_input",
      source: "app-functions/refund-review",
      message: "The requested refund exceeds the paid order total.",
      userMessage: "The refund cannot exceed the amount paid."
    });
  }
}

export function assertAccountArchiveTarget(actorId: string, targetUserId: string): void {
  if (actorId === targetUserId) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/account-retention",
      message: "Administrators cannot archive their own active account.",
      userMessage: "You cannot archive your own active administrator account."
    });
  }
}

export function parseScopedTestRunId(value: unknown): string {
  return testRunIdSchema.parse(value);
}
