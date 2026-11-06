import { AppError } from "@spaceman/app-errors";
import type { StoreDeliveryArea, UpsertStoreInput } from "@spaceman/app-types";

function formInputError(userMessage: string): AppError {
  return new AppError({
    code: "invalid_input",
    source: "admin-web/store-form",
    message: userMessage,
    userMessage,
  });
}

/** Accepts `+27723329351`, `27723329351` or a local `072 332 9351`. */
export function whatsappNumberFrom(value: string): string | undefined {
  const digits = value.replace(/[\s()-]/g, "");
  if (!digits) return undefined;
  if (/^0[6-8]\d{8}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^\+?27[6-8]\d{8}$/.test(digits)) return `+${digits.replace(/^\+/, "")}`;
  if (/^\+[1-9]\d{6,14}$/.test(digits)) return digits;
  throw formInputError(
    "Enter the WhatsApp number as 072 123 4567 or +27721234567.",
  );
}

/** One area per line, as `Mabopane = 40` or `Soshanguve: R50.00` (rand). */
export function deliveryAreasFrom(value: string): StoreDeliveryArea[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.+?)\s*[=:]\s*R?\s*(\d{1,6})(?:[.,](\d{1,2}))?$/i.exec(
        line,
      );
      if (!match?.[1] || match[2] === undefined)
        throw formInputError(
          `Write each delivery area as "Area = fee", for example "Mabopane = 40". Check: ${line}`,
        );
      const cents = (match[3] ?? "").padEnd(2, "0");
      return {
        name: match[1].trim(),
        fee: {
          amountMinor: Number(match[2]) * 100 + Number(cents),
          currency: "ZAR",
        },
      };
    });
}

export function orderChannelFrom(
  data: FormData,
): Pick<
  UpsertStoreInput,
  "orderChannel" | "whatsappE164" | "whatsappDeliveryAreas"
> {
  const orderChannel =
    data.get("orderChannel") === "whatsapp" ? "whatsapp" : "paystack";
  const whatsappE164 = whatsappNumberFrom(
    String(data.get("whatsappE164") ?? ""),
  );
  if (orderChannel === "whatsapp" && whatsappE164 === undefined)
    throw formInputError("A WhatsApp-ordering store needs a WhatsApp number.");
  return {
    orderChannel,
    ...(whatsappE164 === undefined ? {} : { whatsappE164 }),
    whatsappDeliveryAreas: deliveryAreasFrom(
      String(data.get("whatsappDeliveryAreas") ?? ""),
    ),
  };
}
