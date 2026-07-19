export const APP_ROLES = ["customer", "merchant", "driver", "admin", "super_admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const USER_STATUSES = [
  "invited",
  "pending_profile",
  "pending_approval",
  "active",
  "suspended",
  "archived"
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "uninitialized",
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunding",
  "partially_refunded",
  "refunded",
  "chargeback",
  "cancelled"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = [
  "not_requested",
  "requested",
  "approved",
  "processing",
  "completed",
  "rejected",
  "failed"
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "paid",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "on_the_way",
  "delivered",
  "cancelled",
  "cancelled_refunded",
  "refunded"
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  "unassigned",
  "offered",
  "assigned",
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "cancelled"
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const NEEDS_ACTION_REASONS = [
  "none",
  "no_driver_assigned",
  "payment_review",
  "merchant_confirmation_overdue",
  "driver_location_stale",
  "refund_review",
  "delivery_exception",
  "customer_support",
  "serviceability_failed"
] as const;
export type NeedsActionReason = (typeof NEEDS_ACTION_REASONS)[number];

export const ROOT_COLLECTIONS = [
  "users",
  "stores",
  "items",
  "orders",
  "checkoutSessions",
  "paymentEvents",
  "orderEvents",
  "driverAssignments",
  "driverLocations",
  "notifications",
  "notificationOutbox",
  "activities",
  "auditLogs",
  "feeRules",
  "deliveryZones",
  "platformSettings",
  "importBatches",
  "settlements"
] as const;
export type RootCollectionName = (typeof ROOT_COLLECTIONS)[number];

export const FULFILLMENT_TRANSITIONS: Readonly<Record<FulfillmentStatus, readonly FulfillmentStatus[]>> = {
  paid: ["confirmed", "cancelled", "cancelled_refunded", "refunded"],
  confirmed: ["preparing", "cancelled", "cancelled_refunded", "refunded"],
  preparing: ["ready_for_pickup", "cancelled", "cancelled_refunded", "refunded"],
  ready_for_pickup: ["on_the_way", "cancelled", "cancelled_refunded", "refunded"],
  on_the_way: ["delivered", "cancelled_refunded", "refunded"],
  delivered: [],
  cancelled: ["cancelled_refunded", "refunded"],
  cancelled_refunded: [],
  refunded: []
};

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}

export function formatMoney(minorAmount: number, currency = "ZAR", locale = "en-ZA"): string {
  if (!Number.isSafeInteger(minorAmount)) {
    throw new RangeError("Money must be represented as a safe integer minor amount.");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minorAmount / 100);
}

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function isTerminalFulfillmentStatus(status: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[status].length === 0;
}
