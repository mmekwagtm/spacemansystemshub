import { AppError } from "@spaceman/app-errors";
import type {
  CheckoutAddressSnapshot,
  CheckoutFeeRuleSnapshot,
  CheckoutRouteSnapshot,
  Coordinates,
  DeliveryAddressCandidate,
  Money,
} from "@spaceman/app-types";

export interface ServiceabilityQuote {
  deliveryAddress: CheckoutAddressSnapshot;
  routeSnapshot: CheckoutRouteSnapshot;
  feeRuleSnapshot: CheckoutFeeRuleSnapshot;
  deliveryFee: Money;
  verifiedAt: string;
  expiresAt: string;
}

export interface MapsGateway {
  searchDeliveryAddresses(input: {
    query: string;
    sessionToken: string;
  }): Promise<DeliveryAddressCandidate[]>;
  routeBetween(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<{
    distanceMetres: number;
    durationSeconds: number;
  } | null>;
}

export interface DeliveryFeePolicy {
  baseFeeMinor: number;
  includedDistanceMetres: number;
  perKilometreFeeMinor: number;
  smallOrderThresholdMinor: number;
  smallOrderSurchargeMinor: number;
  minimumFeeMinor: number;
  maximumFeeMinor: number;
}

function requireSafeNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-maps/delivery-fee",
      message: `${field} must be a safe non-negative integer.`,
      userMessage:
        "Delivery pricing is not configured correctly. Please try again later.",
    });
  }
}

export function calculateDeliveryFeeMinor(input: {
  distanceMetres: number;
  itemSubtotalMinor: number;
  policy: DeliveryFeePolicy;
}): number {
  requireSafeNonNegativeInteger(input.distanceMetres, "distanceMetres");
  requireSafeNonNegativeInteger(input.itemSubtotalMinor, "itemSubtotalMinor");
  for (const [field, value] of Object.entries(input.policy)) {
    requireSafeNonNegativeInteger(value, field);
  }
  if (input.policy.minimumFeeMinor > input.policy.maximumFeeMinor) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-maps/delivery-fee",
      message: "The delivery fee minimum exceeds the maximum.",
      userMessage:
        "Delivery pricing is not configured correctly. Please try again later.",
    });
  }

  const chargeableDistance = Math.max(
    0,
    input.distanceMetres - input.policy.includedDistanceMetres,
  );
  const distanceNumerator =
    BigInt(chargeableDistance) * BigInt(input.policy.perKilometreFeeMinor);
  const distanceCharge = Number((distanceNumerator + 999n) / 1_000n);
  const surcharge =
    input.itemSubtotalMinor < input.policy.smallOrderThresholdMinor
      ? input.policy.smallOrderSurchargeMinor
      : 0;
  const calculated = input.policy.baseFeeMinor + distanceCharge + surcharge;
  if (!Number.isSafeInteger(calculated)) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-maps/delivery-fee",
      message: "The calculated delivery fee exceeds safe integer limits.",
      userMessage:
        "Delivery pricing could not be calculated. Please try again later.",
    });
  }
  return Math.min(
    input.policy.maximumFeeMinor,
    Math.max(input.policy.minimumFeeMinor, calculated),
  );
}

export function feePolicyFromSnapshot(
  snapshot: CheckoutFeeRuleSnapshot,
): DeliveryFeePolicy {
  return {
    baseFeeMinor: snapshot.baseFee.amountMinor,
    includedDistanceMetres: snapshot.includedDistanceMetres,
    perKilometreFeeMinor: snapshot.perKilometreFee.amountMinor,
    smallOrderThresholdMinor: snapshot.smallOrderThreshold.amountMinor,
    smallOrderSurchargeMinor: snapshot.smallOrderSurcharge.amountMinor,
    minimumFeeMinor: snapshot.minimumFee.amountMinor,
    maximumFeeMinor: snapshot.maximumFee.amountMinor,
  };
}

export function normalizeLocality(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-ZA")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesAllowedLocality(
  addressLocalities: readonly string[],
  allowedLocalities: readonly string[],
): boolean {
  const normalizedAddress = new Set(
    addressLocalities.map(normalizeLocality).filter(Boolean),
  );
  return allowedLocalities
    .map(normalizeLocality)
    .filter(Boolean)
    .some((locality) => normalizedAddress.has(locality));
}

export function parseGoogleDurationSeconds(value: string): number {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value);
  if (!match?.[1]) {
    throw new AppError({
      code: "provider_unavailable",
      source: "app-maps/google-routes",
      message: "Google Routes returned an invalid duration.",
      userMessage:
        "We could not confirm the delivery time. Please try again shortly.",
    });
  }
  return Math.ceil(Number(match[1]));
}

export function requireVerifiedServiceability(
  quote: ServiceabilityQuote | null,
  now: Date = new Date(),
): ServiceabilityQuote {
  const expiresAt = quote === null ? Number.NaN : Date.parse(quote.expiresAt);
  if (
    quote === null ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now.getTime()
  ) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-maps/serviceability",
      message: "A valid maps-backed delivery fee is required before payment.",
      userMessage:
        "We could not confirm delivery and pricing. Please retry before paying.",
    });
  }

  return quote;
}
