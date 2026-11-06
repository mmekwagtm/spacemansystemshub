/** Exact delivery pin, kept only in this browser and added to order messages. */

export type DeliveryPin =
  | { kind: "coords"; latitude: number; longitude: number; note: string }
  | { kind: "link"; link: string; note: string };

export type PinParseResult =
  { pin: DeliveryPin; warning: string } | { error: string };

const STORAGE_KEY = "spaceman.customer.pin.v1";

export function parsePin(raw: string, note = ""): PinParseResult {
  const value = raw.trim();
  if (!value)
    return { error: "Paste a Google Maps link or coordinates first." };
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const match =
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/.exec(decoded) ??
    /(-?\d{1,2}\.\d{2,})\s*,\s*\+?(-?\d{1,3}\.\d{2,})/.exec(decoded);
  const trimmedNote = note.trim().slice(0, 120);
  if (match?.[1] && match[2]) {
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!(
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ))
      return {
        error:
          "Those numbers aren’t valid coordinates. Copy them again from Google Maps.",
      };
    if (!(
      latitude >= -35 &&
      latitude <= -22 &&
      longitude >= 16 &&
      longitude <= 33
    ))
      return {
        error:
          "That pin isn’t in South Africa. Check you copied the right location.",
      };
    const far = !(
      latitude >= -25.75 &&
      latitude <= -25.35 &&
      longitude >= 27.85 &&
      longitude <= 28.25
    );
    return {
      pin: {
        kind: "coords",
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        note: trimmedNote,
      },
      warning: far
        ? "This pin looks far from Mabopane and Soshanguve. Restaurants may not deliver there."
        : "",
    };
  }
  const link =
    /^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[A-Za-z0-9_-]+\S*/.exec(
      value,
    );
  if (link)
    return {
      pin: { kind: "link", link: link[0], note: trimmedNote },
      warning: "",
    };
  return {
    error:
      "We couldn’t find a location in that. Paste the link from Google Maps’ Share button, or coordinates like -25.4987, 28.0934.",
  };
}

export function pinUrl(pin: DeliveryPin): string {
  return pin.kind === "coords"
    ? `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`
    : pin.link;
}

export function pinLabel(pin: DeliveryPin): string {
  return pin.kind === "coords"
    ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`
    : "Google Maps pin (shared link)";
}

export function loadPin(): DeliveryPin | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<DeliveryPin> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const note =
      typeof parsed.note === "string" ? parsed.note.slice(0, 120) : "";
    if (
      parsed.kind === "coords" &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    )
      return {
        kind: "coords",
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        note,
      };
    if (
      parsed.kind === "link" &&
      typeof parsed.link === "string" &&
      /^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(parsed.link)
    )
      return { kind: "link", link: parsed.link, note };
    return null;
  } catch {
    return null;
  }
}

export function savePin(pin: DeliveryPin | null): void {
  try {
    if (pin) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pin));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage can be unavailable (private mode); the pin then lasts this visit. */
  }
}
