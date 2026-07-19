import { AppError } from "@spaceman/app-errors";
import type { Coordinates, DeliveryAddress, Money } from "@spaceman/app-types";

export interface ServiceabilityQuote {
  deliveryAddress: DeliveryAddress;
  deliveryFee: Money;
  distanceMetres: number;
  durationSeconds: number;
  feeRuleId: string;
  verifiedAt: string;
  expiresAt: string;
}

export interface MapsGateway {
  validateAddressAndQuote(input: {
    storeId: string;
    deliveryAddress: DeliveryAddress;
  }): Promise<ServiceabilityQuote | null>;
  routeBetween(origin: Coordinates, destination: Coordinates): Promise<{
    distanceMetres: number;
    durationSeconds: number;
  } | null>;
}

export function requireVerifiedServiceability(
  quote: ServiceabilityQuote | null,
  now: Date = new Date()
): ServiceabilityQuote {
  if (quote === null || new Date(quote.expiresAt).getTime() <= now.getTime()) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-maps/serviceability",
      message: "A valid maps-backed delivery fee is required before payment.",
      userMessage: "We could not confirm delivery and pricing. Please retry before paying."
    });
  }

  return quote;
}
