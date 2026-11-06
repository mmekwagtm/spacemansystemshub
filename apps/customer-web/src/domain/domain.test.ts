import type { Item, Store } from "@spaceman/app-types";
import { describe, expect, it } from "vitest";

import { parsePin, pinUrl } from "./location";
import {
  deliverySummary,
  directionsUrl,
  hoursLabel,
  isOpenNow,
  localPhone,
  menuSections,
  orderChannelOf,
} from "./store";
import { buildWhatsAppMessage, orderTotalMinor, whatsAppUrl } from "./whatsapp";

const metadata = {
  createdAt: "2026-11-01T00:00:00.000Z",
  createdBy: "admin-1",
  updatedAt: "2026-11-01T00:00:00.000Z",
  updatedBy: "admin-1",
};

const everyDay = Array.from({ length: 7 }, (_, day) => ({
  day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  closed: false,
  opensAt: "08:30",
  closesAt: "19:00",
}));

const phalas: Store = {
  ...metadata,
  id: "phalas",
  merchantId: "merchant-1",
  name: "Phala's Eating House",
  searchName: "phalas eating house",
  category: "African food",
  description: "Traditional South African food.",
  status: "active",
  approvalState: "approved",
  source: "manual",
  deliveryZoneIds: ["zone-mabopane"],
  address: {
    label: "Kitchen",
    formattedAddress: "6233 Block S, Mabopane Unit S",
    coordinates: { latitude: -25.4987, longitude: 28.0934 },
    placeId: "ChIJj_KpAp3Pvx4RipYRrOnUkJw",
  },
  openingHours: everyDay,
  openForOrders: true,
  minimumOrder: { amountMinor: 0, currency: "ZAR" },
  orderChannel: "whatsapp",
  whatsappE164: "+27723329351",
  whatsappDeliveryAreas: [
    { name: "Mabopane", fee: { amountMinor: 4_000, currency: "ZAR" } },
    { name: "Soshanguve", fee: { amountMinor: 5_000, currency: "ZAR" } },
  ],
};

function item(name: string, category: string, sortOrder: number): Item {
  return {
    ...metadata,
    id: name,
    storeId: phalas.id,
    name,
    searchName: name.toLowerCase(),
    status: "active",
    available: true,
    price: { amountMinor: 6_000, currency: "ZAR" },
    categoryLabel: category,
    sortOrder,
    source: "manual",
    imageAlt: name,
  };
}

describe("store presentation", () => {
  it("defaults the channel to Paystack and summarises WhatsApp fees", () => {
    expect(orderChannelOf({})).toBe("paystack");
    expect(orderChannelOf(phalas)).toBe("whatsapp");
    expect(deliverySummary(phalas)).toMatch(/^Delivery from R\s?40,00$/);
    expect(deliverySummary(phalas, true)).toMatch(
      /Mabopane R\s?40,00 · Soshanguve/,
    );
    expect(deliverySummary({ ...phalas, whatsappDeliveryAreas: [] })).toBe(
      "Collect only",
    );
    expect(deliverySummary({ ...phalas, orderChannel: "paystack" })).toBe(
      "Delivery fee shown at checkout",
    );
  });

  it("evaluates open hours in South African time", () => {
    // 10:00 SAST on Friday 6 Nov 2026.
    const morning = new Date("2026-11-06T08:00:00.000Z");
    // 20:00 SAST.
    const evening = new Date("2026-11-06T18:00:00.000Z");
    expect(isOpenNow(phalas, morning)).toBe(true);
    expect(isOpenNow(phalas, evening)).toBe(false);
    expect(isOpenNow({ ...phalas, openForOrders: false }, morning)).toBe(false);
    expect(hoursLabel(phalas.openingHours, morning)).toBe("08:30–19:00");
  });

  it("groups menu sections in sort order", () => {
    const sections = menuSections([
      item("Eisbein", "Main meals", 20),
      item("Mala Mogodu", "Specialties", 2),
      item("Chicken Hardbody", "Specialties", 1),
    ]);
    expect(sections.map(([label]) => label)).toEqual([
      "Specialties",
      "Main meals",
    ]);
    expect(sections[0]?.[1].map((entry) => entry.name)).toEqual([
      "Chicken Hardbody",
      "Mala Mogodu",
    ]);
  });

  it("builds directions and local phone numbers", () => {
    expect(directionsUrl(phalas)).toContain("destination=-25.4987%2C28.0934");
    expect(directionsUrl(phalas)).toContain("destination_place_id=");
    expect(localPhone("+27723329351")).toBe("072 332 9351");
  });
});

describe("delivery pin", () => {
  it("reads coordinates, Maps URLs and share links", () => {
    const coords = parsePin("-25.4987, 28.0934", " green gate ");
    expect(coords).toMatchObject({
      pin: {
        kind: "coords",
        latitude: -25.4987,
        longitude: 28.0934,
        note: "green gate",
      },
      warning: "",
    });
    expect(
      parsePin(
        "https://www.google.com/maps/place/x/@-25.5,28.1,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-25.4987!4d28.0934",
      ),
    ).toMatchObject({ pin: { kind: "coords", latitude: -25.4987 } });
    expect(parsePin("https://maps.app.goo.gl/AbC123xyz")).toMatchObject({
      pin: { kind: "link", link: "https://maps.app.goo.gl/AbC123xyz" },
    });
    const pin = parsePin("-25.4987, 28.0934");
    if ("pin" in pin)
      expect(pinUrl(pin.pin)).toContain("query=-25.4987,28.0934");
  });

  it("rejects pins outside South Africa and warns when far away", () => {
    expect(parsePin("51.5072, -0.1276")).toMatchObject({
      error: expect.stringMatching(/South Africa/),
    });
    expect(parsePin("-33.9249, 18.4241")).toMatchObject({
      warning: expect.stringMatching(/far from Mabopane/),
    });
    expect(parsePin("my house")).toMatchObject({ error: expect.any(String) });
    expect(parsePin("  ")).toMatchObject({ error: expect.any(String) });
  });
});

describe("WhatsApp order message", () => {
  const lines = [
    {
      itemId: "mogodu",
      storeId: phalas.id,
      name: "Mala Mogodu",
      unitPrice: { amountMinor: 6_000, currency: "ZAR" as const },
      quantity: 2,
    },
  ];

  it("lists items, area fee, total, address, pin and note", () => {
    const order = {
      storeName: phalas.name,
      lines,
      fulfilment: {
        mode: "delivery" as const,
        areaName: "Mabopane",
        feeMinor: 4_000,
        address: "1234 Block S",
      },
      pin: {
        kind: "coords" as const,
        latitude: -25.4987,
        longitude: 28.0934,
        note: "Green gate",
      },
      customerName: " Thabo ",
      note: "Extra chakalaka",
    };
    const message = buildWhatsAppMessage(order);
    expect(orderTotalMinor(order)).toBe(16_000);
    expect(message).toContain("Hi Phala's Eating House, I’d like to order:");
    expect(message).toMatch(/2 x Mala Mogodu – R\s?120,00/);
    expect(message).toMatch(/Delivery to Mabopane: R\s?40,00/);
    expect(message).toMatch(/Total: R\s?160,00/);
    expect(message).toContain("Deliver to: 1234 Block S");
    expect(message).toContain(
      "Map pin: https://www.google.com/maps/search/?api=1&query=-25.4987,28.0934",
    );
    expect(message).toContain("Landmark: Green gate");
    expect(message).toContain("Name: Thabo");
    expect(message).toContain("Note: Extra chakalaka");
  });

  it("handles collection and builds a wa.me link", () => {
    const message = buildWhatsAppMessage({
      storeName: phalas.name,
      lines,
      fulfilment: { mode: "collect" },
      pin: null,
      customerName: "Lerato",
      note: "",
    });
    expect(message).toContain("I’ll collect.");
    expect(message).not.toContain("Delivery to");
    expect(message).toMatch(/Total: R\s?120,00/);
    expect(whatsAppUrl("+27723329351", "Hi & bye")).toBe(
      "https://wa.me/27723329351?text=Hi%20%26%20bye",
    );
  });
});
