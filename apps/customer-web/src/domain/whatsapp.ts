import { formatMoney } from "@spaceman/app-core";
import type { CartLineSnapshot } from "@spaceman/app-state";

import { pinUrl, type DeliveryPin } from "./location";

export interface WhatsAppOrder {
  storeName: string;
  lines: readonly CartLineSnapshot[];
  fulfilment:
    | { mode: "delivery"; areaName: string; feeMinor: number; address: string }
    | { mode: "collect" };
  pin: DeliveryPin | null;
  customerName: string;
  note: string;
}

export function subtotalMinor(lines: readonly CartLineSnapshot[]): number {
  return lines.reduce(
    (total, line) => total + line.unitPrice.amountMinor * line.quantity,
    0,
  );
}

export function orderTotalMinor(order: WhatsAppOrder): number {
  return (
    subtotalMinor(order.lines) +
    (order.fulfilment.mode === "delivery" ? order.fulfilment.feeMinor : 0)
  );
}

/** Plain-text order for the kitchen. Money stays in integer cents until shown. */
export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const text: string[] = [`Hi ${order.storeName}, I’d like to order:`];
  for (const line of order.lines)
    text.push(
      `${line.quantity} x ${line.name} – ${formatMoney(line.unitPrice.amountMinor * line.quantity)}`,
    );
  text.push("", `Food: ${formatMoney(subtotalMinor(order.lines))}`);
  if (order.fulfilment.mode === "delivery") {
    text.push(
      `Delivery to ${order.fulfilment.areaName}: ${formatMoney(order.fulfilment.feeMinor)}`,
      `Total: ${formatMoney(orderTotalMinor(order))}`,
      "",
    );
    if (order.fulfilment.address.trim())
      text.push(`Deliver to: ${order.fulfilment.address.trim()}`);
    if (order.pin) {
      text.push(`Map pin: ${pinUrl(order.pin)}`);
      if (order.pin.note) text.push(`Landmark: ${order.pin.note}`);
    }
  } else {
    text.push(
      `Total: ${formatMoney(orderTotalMinor(order))}`,
      "",
      "I’ll collect.",
    );
  }
  text.push(`Name: ${order.customerName.trim()}`);
  if (order.note.trim()) text.push(`Note: ${order.note.trim()}`);
  text.push(
    "",
    "Please confirm the final price and when it will be ready.",
    "(Sent via Spaceman Deliveries)",
  );
  return text.join("\n");
}

export function whatsAppUrl(e164: string, message: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
