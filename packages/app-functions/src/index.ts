import {
  APP_ROLES,
  NEEDS_ACTION_REASONS,
  canTransitionFulfillment,
  canTransitionUserStatus,
} from "@spaceman/app-core";
import type {
  AppRole,
  FulfillmentStatus,
  NeedsActionReason,
  UserStatus,
} from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import {
  openingHoursSchema,
  testRunIdSchema,
} from "@spaceman/app-validation";

export const TRUSTED_COMMANDS = [
  "registerCustomerProfile",
  "syncMyClaims",
  "createStaffUser",
  "updateUserStatus",
  "updateUserScope",
  "upsertStore",
  "submitMerchantStore",
  "reviewStoreSubmission",
  "updateMerchantStore",
  "upsertItem",
  "setItemAvailability",
  "retireCatalogItem",
  "searchStorePlaces",
  "stageGoogleStoreImport",
  "stageCsvCatalogImport",
  "commitCatalogImport",
  "cancelCatalogImport",
  "cleanupCatalogMedia",
  "searchDeliveryAddresses",
  "upsertDeliveryZone",
  "publishDeliveryFeeRule",
  "updateCheckoutSettings",
  "createCheckoutSession",
  "initializePaystackPayment",
  "verifyPaystackPayment",
  "transitionMerchantFulfillment",
  "assignDriver",
  "updateDriverLocation",
  "createActivity",
  "requestRefund",
  "archiveOrRedactAccount",
  "seedTestFixtures",
  "cleanupTestFixtures",
] as const;
export type TrustedCommand = (typeof TRUSTED_COMMANDS)[number];

const commandRoles: Readonly<Record<TrustedCommand, readonly AppRole[]>> = {
  registerCustomerProfile: ["customer"],
  syncMyClaims: APP_ROLES,
  createStaffUser: ["super_admin"],
  updateUserStatus: ["admin", "super_admin"],
  updateUserScope: ["admin", "super_admin"],
  upsertStore: ["admin", "super_admin"],
  submitMerchantStore: ["merchant"],
  reviewStoreSubmission: ["admin", "super_admin"],
  updateMerchantStore: ["merchant"],
  upsertItem: ["merchant", "admin", "super_admin"],
  setItemAvailability: ["merchant", "admin", "super_admin"],
  retireCatalogItem: ["admin", "super_admin"],
  searchStorePlaces: ["admin", "super_admin"],
  stageGoogleStoreImport: ["admin", "super_admin"],
  stageCsvCatalogImport: ["admin", "super_admin"],
  commitCatalogImport: ["admin", "super_admin"],
  cancelCatalogImport: ["admin", "super_admin"],
  cleanupCatalogMedia: ["merchant", "admin", "super_admin"],
  searchDeliveryAddresses: ["customer"],
  upsertDeliveryZone: ["admin", "super_admin"],
  publishDeliveryFeeRule: ["admin", "super_admin"],
  updateCheckoutSettings: ["super_admin"],
  createCheckoutSession: ["customer"],
  initializePaystackPayment: ["customer"],
  verifyPaystackPayment: ["customer"],
  transitionMerchantFulfillment: ["merchant", "admin", "super_admin"],
  assignDriver: ["admin", "super_admin"],
  updateDriverLocation: ["driver"],
  createActivity: ["admin", "super_admin"],
  requestRefund: ["admin", "super_admin"],
  archiveOrRedactAccount: ["admin", "super_admin"],
  seedTestFixtures: ["super_admin"],
  cleanupTestFixtures: ["super_admin"],
};

export function assertTrustedCommandAccess(
  command: TrustedCommand,
  role: AppRole,
): void {
  if (!commandRoles[command].includes(role)) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/command-policy",
      message: `Role ${role} cannot execute ${command}.`,
      userMessage: "You do not have permission to complete that action.",
    });
  }
}

export function assertFulfillmentTransition(
  role: AppRole,
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): void {
  if (!canTransitionFulfillment(from, to)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/fulfillment-transition",
      message: `The transition from ${from} to ${to} is not allowed.`,
      userMessage: "This order can no longer move to that status.",
    });
  }

  const merchantTransition =
    ["paid", "confirmed", "preparing"].includes(from) &&
    ["confirmed", "preparing", "ready_for_pickup"].includes(to);
  const driverTransition =
    (from === "ready_for_pickup" && to === "on_the_way") ||
    (from === "on_the_way" && to === "delivered");
  const staffTransition =
    APP_ROLES.includes(role) && (role === "admin" || role === "super_admin");

  if (
    (role === "merchant" && merchantTransition) ||
    (role === "driver" && driverTransition) ||
    staffTransition
  ) {
    return;
  }

  throw new AppError({
    code: "authorization_denied",
    source: "app-functions/fulfillment-transition",
    message: `Role ${role} cannot move ${from} to ${to}.`,
    userMessage: "You do not have permission to update this order status.",
  });
}

export function assertAssignmentVersion(
  expectedVersion: number,
  currentVersion: number,
): void {
  if (expectedVersion !== currentVersion) {
    throw new AppError({
      code: "conflict",
      source: "app-functions/driver-assignment",
      message:
        "Driver assignment version does not match the current assignment.",
      userMessage:
        "This order was updated by another dispatcher. Refresh and try again.",
      debug: { expectedVersion, currentVersion },
    });
  }
}

export function needsActionReasonsAfterAssignment(
  reasons: readonly unknown[],
): NeedsActionReason[] {
  const remaining = reasons.filter(
    (reason): reason is NeedsActionReason =>
      typeof reason === "string" &&
      NEEDS_ACTION_REASONS.includes(reason as NeedsActionReason) &&
      reason !== "none" &&
      reason !== "no_driver_assigned",
  );
  return remaining.length > 0 ? [...new Set(remaining)] : ["none"];
}

export function assertFeeRuleEffectiveNow(
  effectiveFrom: string,
  now: Date = new Date(),
): void {
  const effectiveAt = Date.parse(effectiveFrom);
  if (!Number.isFinite(effectiveAt) || effectiveAt > now.getTime()) {
    throw new AppError({
      code: "invalid_input",
      source: "app-functions/fee-rule-publication",
      message: "Fee-rule publication requires a current effective date.",
      userMessage:
        "Future fee rules are not supported. Choose the current time or earlier.",
    });
  }
}

export function assertStoreScope(
  role: AppRole,
  storeIds: readonly string[],
  storeId: string,
): void {
  if (role === "merchant" && !storeIds.includes(storeId)) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/store-scope",
      message: `Merchant scope does not include store ${storeId}.`,
      userMessage: "You do not have access to that store.",
    });
  }
}

export type MerchantStoreSubmissionAction =
  "create" | "update_pending" | "resubmit_rejected";

export function decideMerchantStoreSubmissionAction(input: {
  exists: boolean;
  actorId: string;
  merchantId?: unknown;
  status?: unknown;
  approvalState?: unknown;
}): MerchantStoreSubmissionAction {
  if (!input.exists) return "create";
  if (input.merchantId !== input.actorId) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/merchant-store-submission",
      message: "The merchant does not own this store submission.",
      userMessage: "You do not have access to that store submission.",
    });
  }
  if (input.status !== "draft") {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/merchant-store-submission",
      message: "Only a draft store submission may be updated.",
      userMessage:
        "Only a draft store submission can be corrected and resubmitted.",
    });
  }
  if (input.approvalState === "pending") return "update_pending";
  if (input.approvalState === "rejected") return "resubmit_rejected";
  throw new AppError({
    code: "precondition_failed",
    source: "app-functions/merchant-store-submission",
    message: "Only a pending or rejected store submission may be updated.",
    userMessage:
      "Only a pending or rejected store submission can be corrected.",
  });
}

export function assertUserManagementScope(
  actorRole: AppRole,
  targetRole: AppRole,
): void {
  const canManageTarget =
    actorRole === "super_admin" ||
    (actorRole === "admin" &&
      targetRole !== "admin" &&
      targetRole !== "super_admin");

  if (!canManageTarget) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/user-management",
      message: `Role ${actorRole} cannot manage a ${targetRole} account.`,
      userMessage: "You do not have permission to manage that account.",
    });
  }
}

export function assertUserStatusTransition(
  from: UserStatus,
  to: UserStatus,
): void {
  if (!canTransitionUserStatus(from, to)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/user-status-transition",
      message: `User status cannot transition from ${from} to ${to}.`,
      userMessage:
        "That account status change is not allowed. Refresh and try again.",
    });
  }
}

export function stableCheckoutSessionId(
  customerId: string,
  idempotencyKey: string,
): string {
  const value = `${customerId}:${idempotencyKey}`;
  let first = 2_166_136_261;
  let second = 2_166_136_261 ^ 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16_777_619);
    second = Math.imul(second ^ (code + index), 16_777_619);
  }
  return `checkout-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function stablePaystackReference(checkoutSessionId: string): string {
  return `spc_${checkoutSessionId}`;
}

export function assertQuoteFresh(
  quoteExpiresAt: string,
  now: Date = new Date(),
): void {
  const expiresAt = Date.parse(quoteExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/checkout-expiry",
      message: "The checkout quote is missing, invalid, or expired.",
      userMessage: "Your delivery quote expired. Recalculate it before paying.",
    });
  }
}

export type PaystackReconciliationStatus =
  "processing" | "paid" | "failed" | "abandoned" | "cancelled";

export interface PaystackReconciliationPlan {
  action: "create_order" | "record_status" | "replay_paid";
  status: PaystackReconciliationStatus;
  sessionStatus:
    | "payment_pending"
    | "failed"
    | "abandoned"
    | "cancelled"
    | "consumed";
  eventStatus: "pending" | "paid" | "failed" | "cancelled";
}

export function planPaystackReconciliation(input: {
  checkoutSessionStatus: string;
  existingOrderId?: unknown;
  providerStatus: PaystackReconciliationStatus;
}): PaystackReconciliationPlan {
  if (input.checkoutSessionStatus === "consumed") {
    if (typeof input.existingOrderId !== "string") {
      throw new AppError({
        code: "precondition_failed",
        source: "app-functions/payment-reconciliation",
        message: "A consumed checkout has no order identifier.",
        userMessage: "Payment status is inconsistent. Please contact support.",
      });
    }
    return {
      action: "replay_paid",
      status: "paid",
      sessionStatus: "consumed",
      eventStatus: "paid",
    };
  }
  if (input.providerStatus === "paid") {
    return {
      action: "create_order",
      status: "paid",
      sessionStatus: "consumed",
      eventStatus: "paid",
    };
  }
  if (input.providerStatus === "failed") {
    return {
      action: "record_status",
      status: "failed",
      sessionStatus: "failed",
      eventStatus: "failed",
    };
  }
  if (input.providerStatus === "cancelled") {
    return {
      action: "record_status",
      status: "cancelled",
      sessionStatus: "cancelled",
      eventStatus: "cancelled",
    };
  }
  if (input.providerStatus === "abandoned") {
    return {
      action: "record_status",
      status: "abandoned",
      sessionStatus: "abandoned",
      eventStatus: "cancelled",
    };
  }
  return {
    action: "record_status",
    status: "processing",
    sessionStatus: "payment_pending",
    eventStatus: "pending",
  };
}

export function classifyPaystackStatus(
  status: string,
): PaystackReconciliationStatus {
  const normalized = status.trim().toLocaleLowerCase("en-ZA");
  if (normalized === "success") return "paid";
  if (normalized === "failed" || normalized === "reversed") return "failed";
  if (normalized === "abandoned") return "abandoned";
  if (normalized === "cancelled") return "cancelled";
  return "processing";
}

export function assertPaystackVerification(input: {
  expectedReference: string;
  expectedAmountMinor: number;
  expectedCurrency: "ZAR";
  providerReference: unknown;
  providerAmountMinor: unknown;
  providerCurrency: unknown;
  providerStatus: unknown;
}): PaystackReconciliationStatus {
  if (
    input.providerReference !== input.expectedReference ||
    input.providerAmountMinor !== input.expectedAmountMinor ||
    input.providerCurrency !== input.expectedCurrency ||
    typeof input.providerStatus !== "string"
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/paystack-verification",
      message:
        "Paystack verification did not match the checkout reference, amount, currency, or status.",
      userMessage:
        "We could not safely match this payment to your checkout. No order was created.",
    });
  }
  return classifyPaystackStatus(input.providerStatus);
}

export function requirePaystackAuthorizationUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError({
      code: "provider_unavailable",
      source: "app-functions/paystack-initialize",
      message: "Paystack returned an invalid authorization URL.",
      userMessage: "Secure payment could not be opened. Please try again.",
    });
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLocaleLowerCase("en-ZA") !== "checkout.paystack.com"
  ) {
    throw new AppError({
      code: "provider_unavailable",
      source: "app-functions/paystack-initialize",
      message: "Paystack returned an unapproved authorization host.",
      userMessage: "Secure payment could not be opened. Please try again.",
    });
  }
  return parsed.toString();
}

export function requirePaystackSecretForEnvironment(
  secret: string,
  environment: string | undefined,
): string {
  if (secret.length === 0) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/paystack-secret",
      message: "The Paystack secret is not configured.",
      userMessage: "Payments are not configured. Please try again later.",
    });
  }
  if (environment === "development" && !secret.startsWith("sk_test_")) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/paystack-secret",
      message: "Development rejects non-test Paystack credentials.",
      userMessage: "Test payments are not safely configured.",
    });
  }
  return secret;
}

export function appCheckEnforcementFromEnvironment(
  value: string | undefined,
): boolean {
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;
  throw new AppError({
    code: "precondition_failed",
    source: "app-functions/app-check-config",
    message: "SPACEMAN_ENFORCE_APP_CHECK must be true or false.",
    userMessage: "App Check enforcement is not configured safely.",
  });
}

export interface StoreOpeningPeriod {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  closed: boolean;
  opensAt?: string;
  closesAt?: string;
}

function localDayAndMinute(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    value("weekday") ?? "",
  );
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  if (day < 0 || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/store-hours",
      message: "The store opening-hours clock could not be evaluated.",
      userMessage: "Store hours could not be confirmed. Please try again.",
    });
  }
  return { day, minuteOfDay: hour * 60 + minute };
}

function clockMinute(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function hasUsableOpeningHours(value: unknown): boolean {
  const parsed = openingHoursSchema.safeParse(value);
  return (
    parsed.success &&
    parsed.data.some(
      (period) =>
        !period.closed &&
        period.opensAt !== undefined &&
        period.closesAt !== undefined &&
        period.opensAt !== period.closesAt,
    )
  );
}

export function isStoreOpenAt(
  periods: readonly StoreOpeningPeriod[],
  now: Date = new Date(),
  timeZone = "Africa/Johannesburg",
): boolean {
  const local = localDayAndMinute(now, timeZone);
  const today = periods.find((period) => period.day === local.day);
  const previous = periods.find((period) => period.day === (local.day + 6) % 7);
  const isOpenFor = (
    period: StoreOpeningPeriod | undefined,
    previousDay: boolean,
  ) => {
    if (!period || period.closed) return false;
    const opens = clockMinute(period.opensAt);
    const closes = clockMinute(period.closesAt);
    if (opens === null || closes === null || opens === closes) return false;
    if (opens < closes) {
      return (
        !previousDay && local.minuteOfDay >= opens && local.minuteOfDay < closes
      );
    }
    return previousDay
      ? local.minuteOfDay < closes
      : local.minuteOfDay >= opens;
  };
  return isOpenFor(today, false) || isOpenFor(previous, true);
}

export function assertForegroundLocationEligibility(
  actorId: string,
  assignedDriverId: unknown,
  fulfillmentStatus: unknown,
): void {
  if (assignedDriverId !== actorId || fulfillmentStatus !== "on_the_way") {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/driver-location",
      message:
        "Foreground location updates require the assigned driver and an active delivery.",
      userMessage: "Location sharing is allowed only for your active delivery.",
    });
  }
}

export function assertRefundReviewAllowed(input: {
  paymentStatus: unknown;
  refundStatus: unknown;
  totalAmountMinor: number;
  requestedAmountMinor: number;
}): void {
  if (
    !Number.isSafeInteger(input.totalAmountMinor) ||
    input.totalAmountMinor <= 0
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "The order total is invalid for a refund review.",
      userMessage:
        "This order cannot be refunded because its payment total is invalid.",
    });
  }
  if (
    !Number.isSafeInteger(input.requestedAmountMinor) ||
    input.requestedAmountMinor <= 0
  ) {
    throw new AppError({
      code: "invalid_input",
      source: "app-functions/refund-review",
      message:
        "The requested refund amount must be a positive integer minor amount.",
      userMessage: "Enter a valid refund amount.",
    });
  }
  if (
    input.paymentStatus !== "paid" &&
    input.paymentStatus !== "partially_refunded"
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "Only paid orders can enter refund review.",
      userMessage: "Only a paid order can be refunded.",
    });
  }
  if (
    input.refundStatus === "processing" ||
    input.refundStatus === "completed"
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/refund-review",
      message: "A refund is already being processed for this order.",
      userMessage: "A refund is already in progress for this order.",
    });
  }
  if (input.requestedAmountMinor > input.totalAmountMinor) {
    throw new AppError({
      code: "invalid_input",
      source: "app-functions/refund-review",
      message: "The requested refund exceeds the paid order total.",
      userMessage: "The refund cannot exceed the amount paid.",
    });
  }
}

export function assertAccountArchiveTarget(
  actorId: string,
  targetUserId: string,
): void {
  if (actorId === targetUserId) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-functions/account-retention",
      message: "Administrators cannot archive their own active account.",
      userMessage: "You cannot archive your own active administrator account.",
    });
  }
}

export function parseScopedTestRunId(value: unknown): string {
  return testRunIdSchema.parse(value);
}

export type CatalogImportCommitAction = "apply" | "replay";

export function decideCatalogImportCommit(
  status: string,
): CatalogImportCommitAction {
  if (status === "applied") return "replay";
  if (status === "ready" || status === "failed") return "apply";
  throw new AppError({
    code: "precondition_failed",
    source: "app-functions/catalog-import-commit",
    message: `Import status ${status} cannot be committed.`,
    userMessage: "This import is not ready to commit. Refresh its preview.",
  });
}

export function stableCatalogImportItemId(
  batchId: string,
  rowId: string,
): string {
  const value = `${batchId}:${rowId}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `import-${(hash >>> 0).toString(16).padStart(8, "0")}-${batchId.slice(0, 12)}-${rowId.slice(0, 12)}`;
}

export function assertCatalogMediaScope(
  storeId: string,
  paths: { sourcePath: string; thumbnailPath: string },
): void {
  const prefix = `catalog/${storeId}/`;
  if (
    !paths.sourcePath.startsWith(prefix) ||
    !paths.thumbnailPath.startsWith(prefix)
  ) {
    throw new AppError({
      code: "authorization_denied",
      source: "app-functions/catalog-media-scope",
      message: `Catalog media does not belong to store ${storeId}.`,
      userMessage: "That image does not belong to this store.",
    });
  }
}
