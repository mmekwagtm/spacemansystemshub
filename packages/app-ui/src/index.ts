import type { FulfillmentStatus, PaymentStatus } from "@spaceman/app-core";

export const spacemanTokens = {
  color: {
    ink: "#10202B",
    canvas: "#F5F7F8",
    brand: "#176B87",
    success: "#1A7F5A",
    warning: "#B7791F",
    danger: "#B8324B"
  },
  radius: {
    card: 12,
    control: 8
  }
} as const;

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export function fulfillmentStatusTone(status: FulfillmentStatus): StatusTone {
  if (status === "delivered") {
    return "success";
  }
  if (status === "cancelled" || status === "cancelled_refunded" || status === "refunded") {
    return "danger";
  }
  if (status === "ready_for_pickup" || status === "on_the_way") {
    return "info";
  }
  return "warning";
}

export function paymentStatusTone(status: PaymentStatus): StatusTone {
  if (status === "paid") {
    return "success";
  }
  if (status === "failed" || status === "chargeback") {
    return "danger";
  }
  if (status === "pending" || status === "authorized" || status === "refunding") {
    return "warning";
  }
  return "neutral";
}
