import { describe, expect, it } from "vitest";

import {
  deliveryAreasFrom,
  orderChannelFrom,
  whatsappNumberFrom,
} from "./storeOrderChannel";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("store ordering-channel form parsing", () => {
  it("normalizes South African WhatsApp numbers", () => {
    expect(whatsappNumberFrom("072 332 9351")).toBe("+27723329351");
    expect(whatsappNumberFrom("27723329351")).toBe("+27723329351");
    expect(whatsappNumberFrom("+27 72 332 9351")).toBe("+27723329351");
    expect(whatsappNumberFrom("")).toBeUndefined();
    expect(() => whatsappNumberFrom("12345")).toThrow();
  });

  it("parses delivery areas in rand into integer cents", () => {
    expect(
      deliveryAreasFrom(
        "Mabopane = 40\nSoshanguve: R50.5\n\n Ga-Rankuwa=45,00 ",
      ),
    ).toEqual([
      { name: "Mabopane", fee: { amountMinor: 4_000, currency: "ZAR" } },
      { name: "Soshanguve", fee: { amountMinor: 5_050, currency: "ZAR" } },
      { name: "Ga-Rankuwa", fee: { amountMinor: 4_500, currency: "ZAR" } },
    ]);
    expect(() => deliveryAreasFrom("Mabopane forty")).toThrow(/Area = fee/);
  });

  it("requires a number for WhatsApp ordering", () => {
    expect(() => orderChannelFrom(form({ orderChannel: "whatsapp" }))).toThrow(
      /WhatsApp number/,
    );
    expect(
      orderChannelFrom(
        form({
          orderChannel: "whatsapp",
          whatsappE164: "072 332 9351",
          whatsappDeliveryAreas: "Mabopane = 40",
        }),
      ),
    ).toEqual({
      orderChannel: "whatsapp",
      whatsappE164: "+27723329351",
      whatsappDeliveryAreas: [
        { name: "Mabopane", fee: { amountMinor: 4_000, currency: "ZAR" } },
      ],
    });
    expect(orderChannelFrom(form({}))).toEqual({
      orderChannel: "paystack",
      whatsappDeliveryAreas: [],
    });
  });
});
