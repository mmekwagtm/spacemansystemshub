import { formatMoney } from "@spaceman/app-core";
import { isStoreOpenAt } from "@spaceman/app-functions";
import type {
  Item,
  OpeningHoursPeriod,
  Store,
  StoreOrderChannel,
} from "@spaceman/app-types";

const TIME_ZONE = "Africa/Johannesburg";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function orderChannelOf(
  store: Pick<Store, "orderChannel">,
): StoreOrderChannel {
  return store.orderChannel === "whatsapp" ? "whatsapp" : "paystack";
}

/** Weekday (0 = Sunday) in South Africa. */
export function localWeekday(now: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(now);
  const day = WEEKDAYS.indexOf(name);
  return day < 0 ? now.getDay() : day;
}

export function localHour(now: Date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return Number.isInteger(hour) ? hour : now.getHours();
}

export function greeting(now: Date = new Date()): string {
  const hour = localHour(now);
  return hour < 12
    ? "Good morning!"
    : hour < 17
      ? "Good afternoon!"
      : "Good evening!";
}

export function todaysHours(
  periods: readonly OpeningHoursPeriod[],
  now: Date = new Date(),
): OpeningHoursPeriod | undefined {
  const today = periods.find((period) => period.day === localWeekday(now));
  return today && !today.closed && today.opensAt && today.closesAt
    ? today
    : undefined;
}

export function hoursLabel(
  periods: readonly OpeningHoursPeriod[],
  now: Date = new Date(),
): string {
  const today = todaysHours(periods, now);
  return today ? `${today.opensAt}–${today.closesAt}` : "Closed today";
}

/** True only when the store takes orders and is inside today's hours. */
export function isOpenNow(store: Store, now: Date = new Date()): boolean {
  if (!store.openForOrders) return false;
  try {
    return isStoreOpenAt(store.openingHours, now);
  } catch {
    return false;
  }
}

export function offersDelivery(store: Store): boolean {
  return orderChannelOf(store) === "whatsapp"
    ? (store.whatsappDeliveryAreas?.length ?? 0) > 0
    : store.deliveryZoneIds.length > 0;
}

export function deliverySummary(store: Store, full = false): string {
  if (orderChannelOf(store) === "paystack")
    return "Delivery fee shown at checkout";
  const areas = store.whatsappDeliveryAreas ?? [];
  if (areas.length === 0) return "Collect only";
  if (full)
    return areas
      .map((area) => `${area.name} ${formatMoney(area.fee.amountMinor)}`)
      .join(" · ");
  const lowest = Math.min(...areas.map((area) => area.fee.amountMinor));
  return `Delivery from ${formatMoney(lowest)}`;
}

export function fromPrice(items: readonly Item[]): number | undefined {
  const prices = items.map((item) => item.price.amountMinor);
  return prices.length ? Math.min(...prices) : undefined;
}

/** Menu sections in first-seen order after sorting items by sort order. */
export function menuSections(items: readonly Item[]): Array<[string, Item[]]> {
  const sorted = [...items].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
  const sections = new Map<string, Item[]>();
  for (const item of sorted) {
    const label = item.categoryLabel || "Menu";
    sections.set(label, [...(sections.get(label) ?? []), item]);
  }
  return [...sections.entries()];
}

export function directionsUrl(store: Store): string {
  const { latitude, longitude } = store.address.coordinates;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${latitude},${longitude}`);
  if (store.address.placeId)
    url.searchParams.set("destination_place_id", store.address.placeId);
  return url.toString();
}

/** `+27723329351` → `072 332 9351`; other numbers are returned unchanged. */
export function localPhone(e164: string): string {
  const match = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : e164;
}

const TONES = ["k", "s", "a", "f"] as const;
export function toneFor(value: string): (typeof TONES)[number] {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? "a";
}
