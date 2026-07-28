import { createHash, randomUUID } from "node:crypto";

import { isAppRole, type AppRole } from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import {
  assertFeeRuleEffectiveNow,
  assertPaystackVerification,
  assertQuoteFresh,
  assertTrustedCommandAccess,
  isStoreOpenAt,
  requirePaystackAuthorizationUrl,
  requirePaystackSecretForEnvironment,
  stableCheckoutSessionId,
  stablePaystackReference,
  type PaystackReconciliationStatus,
  type StoreOpeningPeriod,
} from "@spaceman/app-functions";
import {
  calculateDeliveryFeeMinor,
  matchesAllowedLocality,
  normalizeLocality,
  parseGoogleDurationSeconds,
  ProviderRequestGate,
} from "@spaceman/app-maps";
import type {
  CheckoutAddressSnapshot,
  CheckoutFeeRuleSnapshot,
  CheckoutLine,
  CheckoutQuoteResult,
  CheckoutRouteSnapshot,
  CheckoutSession,
  CheckoutStoreSnapshot,
  DeliveryAddressCandidate,
  Money,
  PaystackPaymentAuthorization,
  PaystackPaymentVerification,
} from "@spaceman/app-types";
import {
  createCheckoutSessionInputSchema,
  initializePaystackPaymentInputSchema,
  paystackWebhookSchema,
  publishDeliveryFeeRuleInputSchema,
  searchDeliveryAddressesInputSchema,
  updateCheckoutSettingsInputSchema,
  upsertDeliveryZoneInputSchema,
  verifyPaystackPaymentInputSchema,
} from "@spaceman/app-validation";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

import {
  parsePaystackInitializeResponse,
  parsePaystackVerificationResponse,
  verifyPaystackSignature,
  type PaystackVerificationData,
} from "./phase4-helpers.js";
import { jsonProviderGateway } from "./provider-gateway.js";

if (getApps().length === 0) initializeApp();

const database = getFirestore();
const functionRegion = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const googleMapsServerApiKey = defineSecret("GOOGLE_MAPS_SERVER_API_KEY");
const paystackSecret = defineSecret("PAYSTACK_SECRET_KEY");
const quoteLifetimeMs = 10 * 60 * 1_000;
const paymentInitializationLeaseMs = 90_000;
const addressSearchGate = new ProviderRequestGate({
  limit: 30,
  windowMs: 60_000,
  cacheTtlMs: 20_000,
  onDecision: (decision) =>
    logger.info("Maps request gate", { flow: "address_search", decision }),
});
const checkoutMapsGate = new ProviderRequestGate({
  limit: 10,
  windowMs: 60_000,
  cacheTtlMs: 0,
  onDecision: (decision) =>
    logger.info("Maps request gate", { flow: "checkout_quote", decision }),
});

type Actor = {
  uid: string;
  role: AppRole;
  email: string;
};

type CallableRequest = {
  auth?: { uid: string; token: Record<string, unknown> } | null;
  data: unknown;
};

type SafeParseResult<TOutput> =
  | { success: true; data: TOutput }
  | { success: false; error: { flatten(): unknown } };

interface SafeParseSchema<TOutput> {
  safeParse(value: unknown): SafeParseResult<TOutput>;
}

type LoadedCatalog = {
  settings: Record<string, unknown>;
  store: Record<string, unknown>;
  items: Array<{ id: string; data: Record<string, unknown> }>;
  fingerprint: string;
};

type PlaceDetails = {
  address: CheckoutAddressSnapshot;
  localityCandidates: string[];
};

type ResolvedZone = {
  id: string;
  feeRule: Record<string, unknown>;
  feeRuleSnapshot: CheckoutFeeRuleSnapshot;
  matchedLocality: string;
};

function parseInput<TOutput>(
  schema: SafeParseSchema<TOutput>,
  data: unknown,
): TOutput {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      "The request input is invalid.",
      parsed.error.flatten(),
    );
  }
  return parsed.data;
}

function asRecord(
  value: unknown,
  message = "The stored checkout record is invalid.",
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new HttpsError("failed-precondition", message);
  return value as Record<string, unknown>;
}

function asString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new HttpsError("failed-precondition", message);
  return value;
}

function asSafeNonNegativeInteger(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new HttpsError("failed-precondition", message);
  return value;
}

function asMoney(value: unknown, message: string): Money {
  const money = asRecord(value, message);
  if (
    money.currency !== "ZAR" ||
    typeof money.amountMinor !== "number" ||
    !Number.isSafeInteger(money.amountMinor) ||
    money.amountMinor < 0
  )
    throw new HttpsError("failed-precondition", message);
  return { amountMinor: money.amountMinor, currency: "ZAR" };
}

function asCoordinates(value: unknown, message: string) {
  const coordinates = asRecord(value, message);
  if (
    typeof coordinates.latitude !== "number" ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90 ||
    typeof coordinates.longitude !== "number" ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180
  )
    throw new HttpsError("failed-precondition", message);
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    value !== null &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    if (date instanceof Date) return date.toISOString();
  }
  throw new HttpsError(
    "failed-precondition",
    "The stored timestamp is invalid.",
  );
}

function asCheckoutSession(
  id: string,
  value: Record<string, unknown>,
): CheckoutSession {
  return {
    ...(value as unknown as CheckoutSession),
    id,
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
  };
}

function throwAppError(error: unknown): never {
  if (!(error instanceof AppError)) throw error;
  const code =
    error.code === "invalid_input"
      ? "invalid-argument"
      : error.code === "rate_limited"
        ? "resource-exhausted"
      : error.code === "authorization_denied"
        ? "permission-denied"
        : error.code === "conflict"
          ? "aborted"
          : error.code === "not_found"
            ? "not-found"
            : error.code === "provider_unavailable" ||
                error.code === "service_unavailable"
              ? "unavailable"
              : "failed-precondition";
  throw new HttpsError(code, error.userMessage);
}

async function requireActor(request: CallableRequest): Promise<Actor> {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Authentication is required.");
  const profileSnapshot = await database
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (!profileSnapshot.exists)
    throw new HttpsError(
      "permission-denied",
      "An active platform profile is required.",
    );
  const profile = asRecord(profileSnapshot.data());
  if (
    typeof profile.role !== "string" ||
    !isAppRole(profile.role) ||
    profile.status !== "active"
  )
    throw new HttpsError(
      "permission-denied",
      "An active platform role is required.",
    );
  if (profile.role === "customer" && request.auth.token.email_verified !== true)
    throw new HttpsError(
      "permission-denied",
      "Customer email verification is required.",
    );
  const email = request.auth.token.email;
  if (typeof email !== "string" || email.length === 0)
    throw new HttpsError(
      "failed-precondition",
      "The authenticated account has no email address.",
    );
  return {
    uid: request.auth.uid,
    role: profile.role,
    email: email.trim().toLocaleLowerCase("en-ZA"),
  };
}

function requireCommand(
  actor: Actor,
  command: Parameters<typeof assertTrustedCommandAccess>[0],
): void {
  try {
    assertTrustedCommandAccess(command, actor.role);
  } catch (error) {
    throwAppError(error);
  }
}

function assertDevelopmentFixture(testRunId: string | undefined): void {
  if (
    testRunId !== undefined &&
    process.env.SPACEMAN_ENVIRONMENT !== "development"
  )
    throw new HttpsError(
      "failed-precondition",
      "Tagged test fixtures are allowed only in development.",
    );
}

function withTestRun(
  testRunId: string | undefined,
): { testRunId: string } | Record<string, never> {
  return testRunId === undefined ? {} : { testRunId };
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function checkoutRequestHash(
  customerId: string,
  input: {
    channel: string;
    storeId: string;
    lines: Array<{ itemId: string; quantity: number }>;
    addressSelection: {
      placeId: string;
      sessionToken: string;
      label: string;
      instructions?: string | undefined;
    };
    testRunId?: string | undefined;
  },
): string {
  return hash({
    customerId,
    channel: input.channel,
    storeId: input.storeId,
    lines: [...input.lines].sort((left, right) =>
      left.itemId.localeCompare(right.itemId),
    ),
    addressSelection: input.addressSelection,
    ...(input.testRunId === undefined ? {} : { testRunId: input.testRunId }),
  });
}

function catalogFingerprint(
  settings: Record<string, unknown>,
  store: Record<string, unknown>,
  items: Array<{ id: string; data: Record<string, unknown> }>,
): string {
  const relevantStore = {
    status: store.status,
    approvalState: store.approvalState,
    openForOrders: store.openForOrders,
    openingHours: store.openingHours,
    minimumOrder: store.minimumOrder,
    deliveryZoneIds: store.deliveryZoneIds,
    address: store.address,
    updatedAt: store.updatedAt,
  };
  return hash({
    settings: {
      maintenanceMode: settings.maintenanceMode,
      customerOrderingEnabled: settings.customerOrderingEnabled,
      mapsQuoteEnabled: settings.mapsQuoteEnabled,
      paystackEnabled: settings.paystackEnabled,
      updatedAt: settings.updatedAt,
    },
    store: relevantStore,
    items: items
      .map(({ id, data }) => ({
        id,
        storeId: data.storeId,
        status: data.status,
        available: data.available,
        name: data.name,
        price: data.price,
        updatedAt: data.updatedAt,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}

function requireCheckoutSettings(
  settings: Record<string, unknown>,
  options: { maps: boolean; payment: boolean },
): void {
  if (
    settings.maintenanceMode === true ||
    settings.customerOrderingEnabled !== true ||
    (options.maps && settings.mapsQuoteEnabled !== true) ||
    (options.payment && settings.paystackEnabled !== true)
  )
    throw new HttpsError(
      "failed-precondition",
      "Checkout is not enabled with complete platform configuration.",
    );
}

function openingHours(value: unknown): StoreOpeningPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const period = entry as Record<string, unknown>;
    if (
      typeof period.day !== "number" ||
      !Number.isInteger(period.day) ||
      period.day < 0 ||
      period.day > 6 ||
      typeof period.closed !== "boolean"
    )
      return [];
    return [
      {
        day: period.day as StoreOpeningPeriod["day"],
        closed: period.closed,
        ...(typeof period.opensAt === "string"
          ? { opensAt: period.opensAt }
          : {}),
        ...(typeof period.closesAt === "string"
          ? { closesAt: period.closesAt }
          : {}),
      },
    ];
  });
}

function requireCheckoutStore(storeId: string, store: Record<string, unknown>) {
  if (
    store.status !== "active" ||
    store.approvalState !== "approved" ||
    store.openForOrders !== true
  )
    throw new HttpsError(
      "failed-precondition",
      "The selected store is not accepting checkout.",
    );
  if (!isStoreOpenAt(openingHours(store.openingHours)))
    throw new HttpsError(
      "failed-precondition",
      "The selected store is outside its configured opening hours.",
    );
  const address = asRecord(
    store.address,
    "The store has no valid route origin.",
  );
  const snapshot: CheckoutStoreSnapshot = {
    id: storeId,
    merchantId: asString(
      store.merchantId,
      "The store has no valid merchant owner.",
    ),
    name: asString(store.name, "The store has no valid name."),
    address: {
      label: asString(address.label, "The store address label is invalid."),
      formattedAddress: asString(
        address.formattedAddress,
        "The store address is invalid.",
      ),
      coordinates: asCoordinates(
        address.coordinates,
        "The store route origin is invalid.",
      ),
      ...(typeof address.placeId === "string"
        ? { placeId: address.placeId }
        : {}),
    },
    openForOrders: true,
    minimumOrder: asMoney(
      store.minimumOrder,
      "The store minimum order is invalid.",
    ),
  };
  return snapshot;
}

function checkoutLines(
  storeId: string,
  requestedLines: Array<{ itemId: string; quantity: number }>,
  items: Array<{ id: string; data: Record<string, unknown> }>,
): { lines: CheckoutLine[]; itemSubtotal: Money } {
  if (
    new Set(requestedLines.map((line) => line.itemId)).size !==
    requestedLines.length
  )
    throw new HttpsError(
      "invalid-argument",
      "Each checkout item may appear only once.",
    );
  const byId = new Map(items.map((item) => [item.id, item.data]));
  let subtotal = 0;
  const lines = requestedLines.map((requested) => {
    const item = byId.get(requested.itemId);
    if (
      !item ||
      item.storeId !== storeId ||
      item.status !== "active" ||
      item.available !== true
    )
      throw new HttpsError(
        "failed-precondition",
        "A checkout item is unavailable or no longer belongs to the store.",
      );
    const unitPrice = asMoney(item.price, "An item price is invalid.");
    const lineTotal = unitPrice.amountMinor * requested.quantity;
    if (!Number.isSafeInteger(lineTotal))
      throw new HttpsError(
        "failed-precondition",
        "A checkout line total exceeds safe limits.",
      );
    subtotal += lineTotal;
    if (!Number.isSafeInteger(subtotal))
      throw new HttpsError(
        "failed-precondition",
        "The checkout subtotal exceeds safe limits.",
      );
    return {
      itemId: requested.itemId,
      nameSnapshot: asString(item.name, "An item name is invalid."),
      quantity: requested.quantity,
      unitPrice,
      total: { amountMinor: lineTotal, currency: "ZAR" as const },
    };
  });
  return {
    lines,
    itemSubtotal: { amountMinor: subtotal, currency: "ZAR" },
  };
}

async function loadCatalog(
  storeId: string,
  itemIds: string[],
): Promise<LoadedCatalog> {
  const [settingsSnapshot, storeSnapshot, ...itemSnapshots] = await Promise.all(
    [
      database.collection("platformSettings").doc("default").get(),
      database.collection("stores").doc(storeId).get(),
      ...itemIds.map((itemId) =>
        database.collection("items").doc(itemId).get(),
      ),
    ],
  );
  if (!settingsSnapshot.exists)
    throw new HttpsError(
      "failed-precondition",
      "Checkout settings have not been configured.",
    );
  if (!storeSnapshot.exists)
    throw new HttpsError("not-found", "The selected store does not exist.");
  if (itemSnapshots.some((snapshot) => !snapshot.exists))
    throw new HttpsError(
      "failed-precondition",
      "One or more checkout items no longer exist.",
    );
  const settings = asRecord(settingsSnapshot.data());
  const store = asRecord(storeSnapshot.data());
  const items = itemSnapshots.map((snapshot) => ({
    id: snapshot.id,
    data: asRecord(snapshot.data()),
  }));
  return {
    settings,
    store,
    items,
    fingerprint: catalogFingerprint(settings, store, items),
  };
}

async function searchGooglePlaces(
  query: string,
  sessionToken: string,
): Promise<DeliveryAddressCandidate[]> {
  const body = await jsonProviderGateway.request(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleMapsServerApiKey.value(),
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["za"],
        languageCode: "en",
        regionCode: "za",
        sessionToken,
      }),
    },
    "google-places-autocomplete",
  );
  const response = asRecord(
    body,
    "Google Places returned an invalid autocomplete response.",
  );
  if (!Array.isArray(response.suggestions)) return [];
  return response.suggestions.slice(0, 5).flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const prediction = (entry as Record<string, unknown>).placePrediction;
    if (prediction === null || typeof prediction !== "object") return [];
    const place = prediction as Record<string, unknown>;
    if (typeof place.placeId !== "string") return [];
    const text = asRecord(
      place.text,
      "Google Places returned an invalid prediction.",
    );
    const structured = asRecord(
      place.structuredFormat,
      "Google Places returned an invalid prediction.",
    );
    const mainText = asRecord(
      structured.mainText,
      "Google Places returned an invalid prediction.",
    );
    if (
      typeof text.text !== "string" ||
      typeof mainText.text !== "string"
    )
      return [];
    let secondaryText = "";
    if (
      structured.secondaryText !== null &&
      typeof structured.secondaryText === "object"
    ) {
      const value = (structured.secondaryText as Record<string, unknown>).text;
      if (typeof value === "string") secondaryText = value;
    }
    return [
      {
        placeId: place.placeId,
        primaryText: mainText.text,
        secondaryText,
        formattedText: text.text,
      },
    ];
  });
}

async function resolveGooglePlace(
  placeId: string,
  sessionToken: string,
  label: string,
  instructions: string | undefined,
): Promise<PlaceDetails> {
  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  url.searchParams.set("sessionToken", sessionToken);
  url.searchParams.set("languageCode", "en");
  url.searchParams.set("regionCode", "za");
  const body = await jsonProviderGateway.request(
    url.toString(),
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": googleMapsServerApiKey.value(),
        "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
      },
    },
    "google-place-details",
  );
  const place = asRecord(body, "Google Places returned invalid place details.");
  if (place.id !== placeId)
    throw new HttpsError(
      "failed-precondition",
      "The selected Google place did not match the requested place.",
    );
  const location = asRecord(
    place.location,
    "The selected address has no valid coordinates.",
  );
  if (!Array.isArray(place.addressComponents))
    throw new HttpsError(
      "failed-precondition",
      "The selected address has no normalized components.",
    );
  const components = place.addressComponents.flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const component = entry as Record<string, unknown>;
    return Array.isArray(component.types)
      ? [
          {
            longText:
              typeof component.longText === "string" ? component.longText : "",
            shortText:
              typeof component.shortText === "string"
                ? component.shortText
                : "",
            types: component.types.filter(
              (type): type is string => typeof type === "string",
            ),
          },
        ]
      : [];
  });
  const country = components.find((component) =>
    component.types.includes("country"),
  );
  if (country?.shortText.toUpperCase() !== "ZA")
    throw new HttpsError(
      "failed-precondition",
      "The selected delivery address is outside South Africa.",
    );
  const localityTypes = new Set([
    "locality",
    "postal_town",
    "sublocality",
    "sublocality_level_1",
    "sublocality_level_2",
    "neighborhood",
    "administrative_area_level_3",
  ]);
  const localityCandidates = components
    .filter((component) =>
      component.types.some((type) => localityTypes.has(type)),
    )
    .map((component) => component.longText)
    .filter(Boolean);
  if (localityCandidates.length === 0)
    throw new HttpsError(
      "failed-precondition",
      "The selected address has no supported locality.",
    );
  return {
    address: {
      label,
      formattedAddress: asString(
        place.formattedAddress,
        "The selected address is not formatted.",
      ),
      coordinates: asCoordinates(
        location,
        "The selected address has no valid coordinates.",
      ),
      placeId,
      countryCode: "ZA",
      locality: localityCandidates[0]!,
      ...(instructions === undefined ? {} : { instructions }),
    },
    localityCandidates,
  };
}

function feeRuleSnapshot(
  id: string,
  rule: Record<string, unknown>,
): CheckoutFeeRuleSnapshot {
  if (
    rule.active !== true ||
    rule.deliveryType !== "standard" ||
    rule.currency !== "ZAR"
  )
    throw new HttpsError(
      "failed-precondition",
      "The active delivery fee rule is invalid.",
    );
  return {
    id,
    deliveryZoneId: asString(
      rule.deliveryZoneId,
      "The fee rule has no delivery zone.",
    ),
    version: asSafeNonNegativeInteger(
      rule.version,
      "The fee rule version is invalid.",
    ),
    name: asString(rule.name, "The fee rule name is invalid."),
    deliveryType: "standard",
    currency: "ZAR",
    baseFee: asMoney(rule.baseFee, "The base delivery fee is invalid."),
    includedDistanceMetres: asSafeNonNegativeInteger(
      rule.includedDistanceMetres,
      "The included delivery distance is invalid.",
    ),
    perKilometreFee: asMoney(
      rule.perKilometreFee,
      "The per-kilometre fee is invalid.",
    ),
    smallOrderThreshold: asMoney(
      rule.smallOrderThreshold,
      "The small-order threshold is invalid.",
    ),
    smallOrderSurcharge: asMoney(
      rule.smallOrderSurcharge,
      "The small-order surcharge is invalid.",
    ),
    minimumFee: asMoney(rule.minimumFee, "The minimum fee is invalid."),
    maximumFee: asMoney(rule.maximumFee, "The maximum fee is invalid."),
    effectiveFrom: toIso(rule.effectiveFrom),
  };
}

async function resolveDeliveryZone(
  store: Record<string, unknown>,
  localities: string[],
): Promise<ResolvedZone> {
  const zoneIds = asStringArray(store.deliveryZoneIds);
  if (zoneIds.length === 0)
    throw new HttpsError(
      "failed-precondition",
      "The selected store has no delivery zone.",
    );
  const zoneSnapshots = await Promise.all(
    zoneIds.map((zoneId) =>
      database.collection("deliveryZones").doc(zoneId).get(),
    ),
  );
  for (const snapshot of zoneSnapshots) {
    if (!snapshot.exists) continue;
    const zone = asRecord(snapshot.data());
    const allowedLocalities = asStringArray(zone.allowedLocalities);
    const matchedLocality = localities.find((candidate) =>
      allowedLocalities.some(
        (allowed) =>
          normalizeLocality(allowed) === normalizeLocality(candidate),
      ),
    );
    if (
      zone.active !== true ||
      zone.countryCode !== "ZA" ||
      !matchesAllowedLocality(localities, allowedLocalities) ||
      matchedLocality === undefined ||
      typeof zone.activeFeeRuleId !== "string"
    )
      continue;
    const feeRuleDocument = await database
      .collection("feeRules")
      .doc(zone.activeFeeRuleId)
      .get();
    if (!feeRuleDocument.exists) continue;
    const rule = asRecord(feeRuleDocument.data());
    const snapshotRule = feeRuleSnapshot(feeRuleDocument.id, rule);
    if (
      snapshotRule.deliveryZoneId !== snapshot.id ||
      Date.parse(snapshotRule.effectiveFrom) > Date.now()
    )
      continue;
    return {
      id: snapshot.id,
      feeRule: rule,
      feeRuleSnapshot: snapshotRule,
      matchedLocality,
    };
  }
  throw new HttpsError(
    "failed-precondition",
    "The selected address is outside the configured Mabopane delivery locality.",
  );
}

async function computeGoogleRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  calculatedAt: string,
): Promise<CheckoutRouteSnapshot> {
  const body = await jsonProviderGateway.request(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleMapsServerApiKey.value(),
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "en",
        units: "METRIC",
      }),
    },
    "google-routes",
  );
  const response = asRecord(body, "Google Routes returned an invalid route.");
  if (!Array.isArray(response.routes) || response.routes.length === 0)
    throw new HttpsError(
      "failed-precondition",
      "Google Routes could not produce a serviceable route.",
    );
  const route = asRecord(
    response.routes[0],
    "Google Routes returned an invalid route.",
  );
  try {
    return {
      provider: "google_routes",
      distanceMetres: asSafeNonNegativeInteger(
        route.distanceMeters,
        "Google Routes returned an invalid distance.",
      ),
      durationSeconds: parseGoogleDurationSeconds(
        asString(route.duration, "Google Routes returned an invalid duration."),
      ),
      calculatedAt,
    };
  } catch (error) {
    throwAppError(error);
  }
}

function paystackReturnUrl(): string {
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new HttpsError(
      "failed-precondition",
      "The fixed Paystack return URL is not configured.",
    );
  }
  return `https://${functionRegion}-${projectId}.cloudfunctions.net/paystackPaymentReturn`;
}

async function verifyWithPaystack(
  reference: string,
  secret: string,
): Promise<{ data: PaystackVerificationData; payloadHash: string }> {
  const payload = await jsonProviderGateway.request(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
    "paystack-verify",
  );
  try {
    return {
      data: parsePaystackVerificationResponse(payload),
      payloadHash: hash(payload),
    };
  } catch (error) {
    throwAppError(error);
  }
}

async function reconcileVerifiedPayment(input: {
  checkoutSessionId: string;
  provider: PaystackVerificationData;
  payloadHash: string;
}): Promise<PaystackPaymentVerification> {
  const sessionReference = database
    .collection("checkoutSessions")
    .doc(input.checkoutSessionId);
  let result: PaystackPaymentVerification = {
    checkoutSessionId: input.checkoutSessionId,
    status: "processing",
  };
  await database.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionReference);
    if (!sessionSnapshot.exists)
      throw new HttpsError("not-found", "The checkout session does not exist.");
    const session = asRecord(sessionSnapshot.data());
    if (session.status === "consumed" && typeof session.orderId === "string") {
      result = {
        checkoutSessionId: input.checkoutSessionId,
        status: "paid",
        orderId: session.orderId,
      };
      return;
    }
    const total = asMoney(session.total, "The checkout total is invalid.");
    const reference = asString(
      session.paystackReference,
      "The checkout has no payment reference.",
    );
    let status: PaystackReconciliationStatus;
    try {
      status = assertPaystackVerification({
        expectedReference: reference,
        expectedAmountMinor: total.amountMinor,
        expectedCurrency: "ZAR",
        providerReference: input.provider.reference,
        providerAmountMinor: input.provider.amountMinor,
        providerCurrency: input.provider.currency,
        providerStatus: input.provider.status,
      });
    } catch (error) {
      throwAppError(error);
    }

    const now = Timestamp.now();
    const eventStatus =
      status === "paid"
        ? "paid"
        : status === "failed"
          ? "failed"
          : status === "abandoned"
            ? "cancelled"
            : "pending";
    const eventId = `paystack-${hash(
      `${input.provider.transactionId}:${status}`,
    ).slice(0, 32)}`;
    const eventReference = database.collection("paymentEvents").doc(eventId);
    const eventSnapshot = await transaction.get(eventReference);
    const testRun =
      typeof session.testRunId === "string"
        ? { testRunId: session.testRunId }
        : {};
    const eventDocument = {
      id: eventReference.id,
      checkoutSessionId: input.checkoutSessionId,
      provider: "paystack",
      providerEventId: input.provider.transactionId,
      reference,
      status: eventStatus,
      receivedAt: now,
      payloadHash: input.payloadHash,
      ...testRun,
      createdAt: now,
      createdBy: "system",
      updatedAt: now,
      updatedBy: "system",
    };

    if (status !== "paid") {
      if (!eventSnapshot.exists)
        transaction.create(eventReference, eventDocument);
      transaction.update(sessionReference, {
        status:
          status === "failed"
            ? "failed"
            : status === "abandoned"
              ? "abandoned"
              : "payment_pending",
        paymentLastCheckedAt: now,
        ...(status === "failed" || status === "abandoned"
          ? { paymentFailureReason: status }
          : {}),
        updatedAt: now,
        updatedBy: "system",
      });
      result = { checkoutSessionId: input.checkoutSessionId, status };
      return;
    }

    const orderReference = database
      .collection("orders")
      .doc(input.checkoutSessionId);
    const orderSnapshot = await transaction.get(orderReference);
    const orderEventReference = database
      .collection("orderEvents")
      .doc(`${input.checkoutSessionId}-paid`);
    const orderEventSnapshot = await transaction.get(orderEventReference);
    const auditReference = database
      .collection("auditLogs")
      .doc(`${input.checkoutSessionId}-payment-verified`);
    const auditSnapshot = await transaction.get(auditReference);
    const storeSnapshot = asRecord(
      session.storeSnapshot,
      "The checkout store snapshot is invalid.",
    );
    const merchantId = asString(
      storeSnapshot.merchantId,
      "The checkout has no merchant recipient.",
    );
    const notificationReference = database
      .collection("notifications")
      .doc(`${input.checkoutSessionId}-merchant-paid`);
    const notificationSnapshot = await transaction.get(notificationReference);
    const outboxReference = database
      .collection("notificationOutbox")
      .doc(`${input.checkoutSessionId}-merchant-paid-in-app`);
    const outboxSnapshot = await transaction.get(outboxReference);
    const paidAtDate =
      input.provider.paidAt === undefined
        ? null
        : new Date(input.provider.paidAt);
    const paidAt =
      paidAtDate !== null && Number.isFinite(paidAtDate.getTime())
        ? Timestamp.fromDate(paidAtDate)
        : now;

    if (!orderSnapshot.exists) {
      transaction.create(orderReference, {
        id: orderReference.id,
        schemaVersion: 1,
        channel: session.channel,
        checkoutSessionId: input.checkoutSessionId,
        customerId: session.customerId,
        storeId: session.storeId,
        requestHash: session.requestHash,
        lines: session.lines,
        storeSnapshot: session.storeSnapshot,
        deliveryAddress: session.deliveryAddress,
        routeSnapshot: session.routeSnapshot,
        feeRuleSnapshot: session.feeRuleSnapshot,
        itemSubtotal: session.itemSubtotal,
        deliveryFee: session.deliveryFee,
        serviceFee: session.serviceFee,
        total: session.total,
        payment: {
          status: "paid",
          provider: "paystack",
          reference,
          paidAt,
          refundStatus: "not_requested",
        },
        fulfillment: { status: "paid" },
        assignment: { status: "unassigned", version: 0 },
        needsAction: { reasons: ["no_driver_assigned"], updatedAt: now },
        ...testRun,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    if (!orderEventSnapshot.exists) {
      transaction.create(orderEventReference, {
        id: orderEventReference.id,
        orderId: orderReference.id,
        actorId: "system",
        actorRole: "system",
        eventType: "payment_verified_order_created",
        nextFulfillmentStatus: "paid",
        ...testRun,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    if (!auditSnapshot.exists) {
      transaction.create(auditReference, {
        id: auditReference.id,
        actorId: "system",
        actorRole: "system",
        action: "payment_verified_order_created",
        targetType: "order",
        targetId: orderReference.id,
        correlationId: input.checkoutSessionId,
        detail: { provider: "paystack", amountMinor: total.amountMinor },
        ...testRun,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    if (!notificationSnapshot.exists) {
      transaction.create(notificationReference, {
        id: notificationReference.id,
        recipientId: merchantId,
        type: "merchant_paid_order",
        title: "New paid order",
        body: "A verified paid order is ready for confirmation.",
        route: `/orders/${orderReference.id}`,
        ...testRun,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    if (!outboxSnapshot.exists) {
      transaction.create(outboxReference, {
        id: outboxReference.id,
        recipientId: merchantId,
        notificationId: notificationReference.id,
        channel: "in_app",
        status: "pending",
        deduplicationKey: `merchant-paid:${orderReference.id}`,
        attempts: 0,
        ...testRun,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    if (!eventSnapshot.exists)
      transaction.create(eventReference, {
        ...eventDocument,
        orderId: orderReference.id,
      });
    else if (asRecord(eventSnapshot.data()).orderId !== orderReference.id)
      transaction.update(eventReference, { orderId: orderReference.id });
    transaction.update(sessionReference, {
      status: "consumed",
      orderId: orderReference.id,
      consumedAt: now,
      paymentLastCheckedAt: now,
      updatedAt: now,
      updatedBy: "system",
    });
    result = {
      checkoutSessionId: input.checkoutSessionId,
      status: "paid",
      orderId: orderReference.id,
    };
  });
  return result;
}

export const searchDeliveryAddresses = onCall(
  {
    region: functionRegion,
    secrets: [googleMapsServerApiKey],
    maxInstances: 10,
  },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "searchDeliveryAddresses");
    const input = parseInput(searchDeliveryAddressesInputSchema, request.data);
    const [settingsSnapshot, storeSnapshot] = await Promise.all([
      database.collection("platformSettings").doc("default").get(),
      database.collection("stores").doc(input.storeId).get(),
    ]);
    if (!settingsSnapshot.exists || !storeSnapshot.exists)
      throw new HttpsError(
        "failed-precondition",
        "Checkout configuration is incomplete.",
      );
    requireCheckoutSettings(asRecord(settingsSnapshot.data()), {
      maps: true,
      payment: false,
    });
    const store = asRecord(storeSnapshot.data());
    if (store.status !== "active" || store.approvalState !== "approved")
      throw new HttpsError(
        "failed-precondition",
        "The selected store is unavailable for delivery search.",
      );
    try {
      return await addressSearchGate.run(
        {
          actorId: actor.uid,
          cacheKey: `${input.storeId}:${input.sessionToken}:${normalizeLocality(input.query)}`,
        },
        () => searchGooglePlaces(input.query, input.sessionToken),
      );
    } catch (error) {
      throwAppError(error);
    }
  },
);

export const createCheckoutSession = onCall(
  {
    region: functionRegion,
    secrets: [googleMapsServerApiKey],
    maxInstances: 10,
  },
  async (request): Promise<CheckoutQuoteResult> => {
    const actor = await requireActor(request);
    requireCommand(actor, "createCheckoutSession");
    const input = parseInput(createCheckoutSessionInputSchema, request.data);
    assertDevelopmentFixture(input.testRunId);
    const requestHash = checkoutRequestHash(actor.uid, input);
    const checkoutSessionId = stableCheckoutSessionId(
      actor.uid,
      input.idempotencyKey,
    );
    const sessionReference = database
      .collection("checkoutSessions")
      .doc(checkoutSessionId);
    const existingSnapshot = await sessionReference.get();
    if (existingSnapshot.exists) {
      const existing = asRecord(existingSnapshot.data());
      if (
        existing.customerId !== actor.uid ||
        existing.requestHash !== requestHash
      )
        throw new HttpsError(
          "aborted",
          "This checkout idempotency key was already used for different input.",
        );
      return {
        checkoutSession: asCheckoutSession(checkoutSessionId, existing),
      };
    }
    try {
      await checkoutMapsGate.run({ actorId: actor.uid }, async () => undefined);
    } catch (error) {
      throwAppError(error);
    }

    const loaded = await loadCatalog(
      input.storeId,
      input.lines.map((line) => line.itemId),
    );
    requireCheckoutSettings(loaded.settings, {
      maps: true,
      payment: false,
    });
    const storeSnapshot = requireCheckoutStore(input.storeId, loaded.store);
    const quotedLines = checkoutLines(input.storeId, input.lines, loaded.items);
    if (
      quotedLines.itemSubtotal.amountMinor <
      storeSnapshot.minimumOrder.amountMinor
    )
      throw new HttpsError(
        "failed-precondition",
        "The cart is below the store minimum order.",
      );
    const place = await resolveGooglePlace(
      input.addressSelection.placeId,
      input.addressSelection.sessionToken,
      input.addressSelection.label,
      input.addressSelection.instructions,
    );
    const zone = await resolveDeliveryZone(
      loaded.store,
      place.localityCandidates,
    );
    const now = new Date();
    const nowIso = now.toISOString();
    const routeSnapshot = await computeGoogleRoute(
      storeSnapshot.address.coordinates,
      place.address.coordinates,
      nowIso,
    );
    let deliveryFeeMinor: number;
    try {
      deliveryFeeMinor = calculateDeliveryFeeMinor({
        distanceMetres: routeSnapshot.distanceMetres,
        itemSubtotalMinor: quotedLines.itemSubtotal.amountMinor,
        policy: {
          baseFeeMinor: zone.feeRuleSnapshot.baseFee.amountMinor,
          includedDistanceMetres: zone.feeRuleSnapshot.includedDistanceMetres,
          perKilometreFeeMinor:
            zone.feeRuleSnapshot.perKilometreFee.amountMinor,
          smallOrderThresholdMinor:
            zone.feeRuleSnapshot.smallOrderThreshold.amountMinor,
          smallOrderSurchargeMinor:
            zone.feeRuleSnapshot.smallOrderSurcharge.amountMinor,
          minimumFeeMinor: zone.feeRuleSnapshot.minimumFee.amountMinor,
          maximumFeeMinor: zone.feeRuleSnapshot.maximumFee.amountMinor,
        },
      });
    } catch (error) {
      throwAppError(error);
    }
    const totalMinor = quotedLines.itemSubtotal.amountMinor + deliveryFeeMinor;
    if (!Number.isSafeInteger(totalMinor))
      throw new HttpsError(
        "failed-precondition",
        "The checkout total exceeds safe limits.",
      );
    const quoteExpiresAt = new Date(
      now.getTime() + quoteLifetimeMs,
    ).toISOString();
    const checkoutSession: CheckoutSession = {
      id: checkoutSessionId,
      schemaVersion: 1,
      channel: input.channel,
      customerId: actor.uid,
      storeId: input.storeId,
      requestHash,
      idempotencyKey: input.idempotencyKey,
      status: "quoted",
      lines: quotedLines.lines,
      storeSnapshot,
      deliveryAddress: {
        ...place.address,
        locality: zone.matchedLocality,
      },
      routeSnapshot,
      feeRuleSnapshot: zone.feeRuleSnapshot,
      itemSubtotal: quotedLines.itemSubtotal,
      deliveryFee: { amountMinor: deliveryFeeMinor, currency: "ZAR" },
      serviceFee: { amountMinor: 0, currency: "ZAR" },
      total: { amountMinor: totalMinor, currency: "ZAR" },
      feeRuleId: zone.feeRuleSnapshot.id,
      quoteExpiresAt,
      paymentProvider: "paystack",
      ...withTestRun(input.testRunId),
      createdAt: nowIso,
      createdBy: actor.uid,
      updatedAt: nowIso,
      updatedBy: actor.uid,
    };

    await database.runTransaction(async (transaction) => {
      const [
        currentSession,
        currentSettings,
        currentStore,
        currentZone,
        currentRule,
        ...currentItems
      ] = await Promise.all([
        transaction.get(sessionReference),
        transaction.get(database.collection("platformSettings").doc("default")),
        transaction.get(database.collection("stores").doc(input.storeId)),
        transaction.get(database.collection("deliveryZones").doc(zone.id)),
        transaction.get(
          database.collection("feeRules").doc(zone.feeRuleSnapshot.id),
        ),
        ...input.lines.map((line) =>
          transaction.get(database.collection("items").doc(line.itemId)),
        ),
      ]);
      if (currentSession.exists) {
        const current = asRecord(currentSession.data());
        if (
          current.customerId !== actor.uid ||
          current.requestHash !== requestHash
        )
          throw new HttpsError(
            "aborted",
            "This checkout idempotency key was reused for different input.",
          );
        return;
      }
      if (
        !currentSettings.exists ||
        !currentStore.exists ||
        !currentZone.exists ||
        !currentRule.exists ||
        currentItems.some((snapshot) => !snapshot.exists)
      )
        throw new HttpsError(
          "aborted",
          "Checkout configuration changed while the quote was calculated.",
        );
      const currentCatalogItems = currentItems.map((snapshot) => ({
        id: snapshot.id,
        data: asRecord(snapshot.data()),
      }));
      const currentFingerprint = catalogFingerprint(
        asRecord(currentSettings.data()),
        asRecord(currentStore.data()),
        currentCatalogItems,
      );
      if (
        currentFingerprint !== loaded.fingerprint ||
        asRecord(currentZone.data()).activeFeeRuleId !==
          zone.feeRuleSnapshot.id ||
        hash(asRecord(currentRule.data())) !== hash(zone.feeRule)
      )
        throw new HttpsError(
          "aborted",
          "Catalog or delivery pricing changed while the quote was calculated.",
        );
      transaction.create(sessionReference, {
        ...checkoutSession,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    });
    const committed = await sessionReference.get();
    return {
      checkoutSession: asCheckoutSession(
        checkoutSessionId,
        asRecord(committed.data()),
      ),
    };
  },
);

export const upsertDeliveryZone = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "upsertDeliveryZone");
    const input = parseInput(upsertDeliveryZoneInputSchema, request.data);
    assertDevelopmentFixture(input.testRunId);
    const reference = input.deliveryZoneId
      ? database.collection("deliveryZones").doc(input.deliveryZoneId)
      : database.collection("deliveryZones").doc();
    await database.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(reference);
      const existing = existingSnapshot.exists
        ? asRecord(existingSnapshot.data())
        : {};
      const previousLocalities = asStringArray(existing.allowedLocalities);
      const serviceAreaChanged =
        existing.countryCode !== input.countryCode ||
        hash(previousLocalities) !== hash(input.allowedLocalities);
      const now = Timestamp.now();
      transaction.set(
        reference,
        {
          id: reference.id,
          name: input.name,
          active: input.active,
          countryCode: input.countryCode,
          allowedLocalities: input.allowedLocalities,
          serviceAreaVersion:
            typeof existing.serviceAreaVersion === "number"
              ? existing.serviceAreaVersion + (serviceAreaChanged ? 1 : 0)
              : 1,
          ...(typeof existing.activeFeeRuleId === "string"
            ? { activeFeeRuleId: existing.activeFeeRuleId }
            : {}),
          ...withTestRun(input.testRunId),
          createdAt:
            existing.createdAt instanceof Timestamp ? existing.createdAt : now,
          createdBy:
            typeof existing.createdBy === "string"
              ? existing.createdBy
              : actor.uid,
          updatedAt: now,
          updatedBy: actor.uid,
        },
        { merge: false },
      );
      const auditReference = database.collection("auditLogs").doc();
      transaction.create(auditReference, {
        id: auditReference.id,
        actorId: actor.uid,
        actorRole: actor.role,
        action: existingSnapshot.exists
          ? "delivery_zone_updated"
          : "delivery_zone_created",
        targetType: "deliveryZone",
        targetId: reference.id,
        detail: {
          active: input.active,
          serviceAreaChanged,
          localityCount: input.allowedLocalities.length,
        },
        ...withTestRun(input.testRunId),
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      });
    });
    return { id: reference.id, acceptedAt: new Date().toISOString() };
  },
);

export const publishDeliveryFeeRule = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "publishDeliveryFeeRule");
    const input = parseInput(publishDeliveryFeeRuleInputSchema, request.data);
    assertDevelopmentFixture(input.testRunId);
    try {
      assertFeeRuleEffectiveNow(input.effectiveFrom);
    } catch (error) {
      throwAppError(error);
    }
    const zoneReference = database
      .collection("deliveryZones")
      .doc(input.deliveryZoneId);
    const latestQuery = database
      .collection("feeRules")
      .where("deliveryZoneId", "==", input.deliveryZoneId)
      .orderBy("version", "desc")
      .limit(1);
    let publishedRuleId = "";
    await database.runTransaction(async (transaction) => {
      const [zoneSnapshot, latestSnapshot] = await Promise.all([
        transaction.get(zoneReference),
        transaction.get(latestQuery),
      ]);
      if (!zoneSnapshot.exists)
        throw new HttpsError("not-found", "The delivery zone does not exist.");
      const latest = latestSnapshot.empty
        ? undefined
        : asRecord(latestSnapshot.docs[0]!.data());
      const version =
        typeof latest?.version === "number" ? latest.version + 1 : 1;
      const ruleReference = database
        .collection("feeRules")
        .doc(`${input.deliveryZoneId}-v${version}-${hash(input).slice(0, 10)}`);
      const ruleSnapshot = await transaction.get(ruleReference);
      publishedRuleId = ruleReference.id;
      if (ruleSnapshot.exists) return;
      const zone = asRecord(zoneSnapshot.data());
      const now = Timestamp.now();
      const previousRuleId =
        typeof zone.activeFeeRuleId === "string"
          ? zone.activeFeeRuleId
          : undefined;
      if (previousRuleId) {
        transaction.update(
          database.collection("feeRules").doc(previousRuleId),
          {
            active: false,
            updatedAt: now,
            updatedBy: actor.uid,
          },
        );
      }
      transaction.create(ruleReference, {
        id: ruleReference.id,
        deliveryZoneId: input.deliveryZoneId,
        version,
        name: input.name,
        deliveryType: input.deliveryType,
        active: true,
        currency: "ZAR",
        baseFee: input.baseFee,
        includedDistanceMetres: input.includedDistanceMetres,
        perKilometreFee: input.perKilometreFee,
        smallOrderThreshold: input.smallOrderThreshold,
        smallOrderSurcharge: input.smallOrderSurcharge,
        minimumFee: input.minimumFee,
        maximumFee: input.maximumFee,
        effectiveFrom: Timestamp.fromDate(new Date(input.effectiveFrom)),
        ...(previousRuleId ? { supersedesFeeRuleId: previousRuleId } : {}),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...withTestRun(input.testRunId),
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      });
      transaction.update(zoneReference, {
        activeFeeRuleId: ruleReference.id,
        updatedAt: now,
        updatedBy: actor.uid,
      });
      const auditReference = database.collection("auditLogs").doc();
      transaction.create(auditReference, {
        id: auditReference.id,
        actorId: actor.uid,
        actorRole: actor.role,
        action: "delivery_fee_rule_published",
        targetType: "feeRule",
        targetId: ruleReference.id,
        correlationId: input.deliveryZoneId,
        detail: { version },
        ...withTestRun(input.testRunId),
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      });
    });
    if (!publishedRuleId)
      throw new HttpsError(
        "internal",
        "The fee-rule publication did not produce an identifier.",
      );
    return { id: publishedRuleId, acceptedAt: new Date().toISOString() };
  },
);

export const updateCheckoutSettings = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "updateCheckoutSettings");
    const input = parseInput(updateCheckoutSettingsInputSchema, request.data);
    assertDevelopmentFixture(input.testRunId);
    const settingsReference = database
      .collection("platformSettings")
      .doc("default");
    await database.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(settingsReference);
      const existing = existingSnapshot.exists
        ? asRecord(existingSnapshot.data())
        : {};
      const now = Timestamp.now();
      transaction.set(
        settingsReference,
        {
          id: "default",
          maintenanceMode:
            typeof existing.maintenanceMode === "boolean"
              ? existing.maintenanceMode
              : false,
          customerOrderingEnabled: input.customerOrderingEnabled,
          mapsQuoteEnabled: input.mapsQuoteEnabled,
          paystackEnabled: input.paystackEnabled,
          notificationDeliveryEnabled:
            typeof existing.notificationDeliveryEnabled === "boolean"
              ? existing.notificationDeliveryEnabled
              : false,
          schemaVersion: 1,
          createdAt:
            existing.createdAt instanceof Timestamp ? existing.createdAt : now,
          createdBy:
            typeof existing.createdBy === "string"
              ? existing.createdBy
              : actor.uid,
          updatedAt: now,
          updatedBy: actor.uid,
        },
        { merge: true },
      );
      const auditReference = database.collection("auditLogs").doc();
      transaction.create(auditReference, {
        id: auditReference.id,
        actorId: actor.uid,
        actorRole: actor.role,
        action: "checkout_settings_updated",
        targetType: "platformSettings",
        targetId: "default",
        detail: {
          customerOrderingEnabled: input.customerOrderingEnabled,
          mapsQuoteEnabled: input.mapsQuoteEnabled,
          paystackEnabled: input.paystackEnabled,
        },
        ...withTestRun(input.testRunId),
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      });
    });
    return { id: "default", acceptedAt: new Date().toISOString() };
  },
);

export const initializePaystackPayment = onCall(
  { region: functionRegion, secrets: [paystackSecret] },
  async (request): Promise<PaystackPaymentAuthorization> => {
    const actor = await requireActor(request);
    requireCommand(actor, "initializePaystackPayment");
    const input = parseInput(
      initializePaystackPaymentInputSchema,
      request.data,
    );
    const sessionReference = database
      .collection("checkoutSessions")
      .doc(input.checkoutSessionId);
    const [settingsSnapshot, sessionSnapshot] = await Promise.all([
      database.collection("platformSettings").doc("default").get(),
      sessionReference.get(),
    ]);
    if (!settingsSnapshot.exists)
      throw new HttpsError(
        "failed-precondition",
        "Checkout settings have not been configured.",
      );
    requireCheckoutSettings(asRecord(settingsSnapshot.data()), {
      maps: true,
      payment: true,
    });
    if (!sessionSnapshot.exists)
      throw new HttpsError("not-found", "The checkout session does not exist.");
    const session = asRecord(sessionSnapshot.data());
    if (session.customerId !== actor.uid)
      throw new HttpsError(
        "permission-denied",
        "The checkout session belongs to another customer.",
      );
    if (
      typeof session.paystackAuthorizationUrl === "string" &&
      typeof session.paystackReference === "string"
    )
      return {
        checkoutSessionId: input.checkoutSessionId,
        reference: session.paystackReference,
        authorizationUrl: session.paystackAuthorizationUrl,
        quoteExpiresAt: asString(
          session.quoteExpiresAt,
          "The checkout quote expiry is invalid.",
        ),
      };
    try {
      assertQuoteFresh(
        asString(
          session.quoteExpiresAt,
          "The checkout quote expiry is invalid.",
        ),
      );
    } catch (error) {
      throwAppError(error);
    }
    if (session.status !== "quoted" && session.status !== "payment_initialized")
      throw new HttpsError(
        "failed-precondition",
        "The checkout is not ready for payment initialization.",
      );
    const reference = stablePaystackReference(input.checkoutSessionId);
    const total = asMoney(session.total, "The checkout total is invalid.");
    const initializationAttemptId = randomUUID();
    let concurrentAuthorization: PaystackPaymentAuthorization | undefined;
    let secret: string;
    try {
      secret = requirePaystackSecretForEnvironment(
        paystackSecret.value(),
        process.env.SPACEMAN_ENVIRONMENT,
      );
    } catch (error) {
      throwAppError(error);
    }
    await database.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(sessionReference);
      if (!currentSnapshot.exists)
        throw new HttpsError("not-found", "The checkout session disappeared.");
      const current = asRecord(currentSnapshot.data());
      if (current.customerId !== actor.uid)
        throw new HttpsError(
          "permission-denied",
          "The checkout session belongs to another customer.",
        );
      if (
        typeof current.paystackAuthorizationUrl === "string" &&
        typeof current.paystackReference === "string"
      ) {
        concurrentAuthorization = {
          checkoutSessionId: input.checkoutSessionId,
          reference: current.paystackReference,
          authorizationUrl: current.paystackAuthorizationUrl,
          quoteExpiresAt: asString(
            current.quoteExpiresAt,
            "The checkout quote expiry is invalid.",
          ),
        };
        return;
      }
      const previousAttemptAt =
        current.paymentInitializedAt === undefined
          ? Number.NaN
          : Date.parse(toIso(current.paymentInitializedAt));
      if (
        current.status === "payment_initialized" &&
        typeof current.paymentInitializationAttemptId === "string" &&
        Number.isFinite(previousAttemptAt) &&
        Date.now() - previousAttemptAt < paymentInitializationLeaseMs
      )
        throw new HttpsError(
          "aborted",
          "Secure payment initialization is already in progress.",
        );
      if (
        current.status !== "quoted" &&
        current.status !== "payment_initialized"
      )
        throw new HttpsError(
          "failed-precondition",
          "The checkout is not ready for payment initialization.",
        );
      transaction.update(sessionReference, {
        status: "payment_initialized",
        paystackReference: reference,
        paymentInitializationAttemptId: initializationAttemptId,
        paymentInitializedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: actor.uid,
      });
    });
    if (concurrentAuthorization) return concurrentAuthorization;

    let initialized: ReturnType<typeof parsePaystackInitializeResponse>;
    try {
      const payload = await jsonProviderGateway.request(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: actor.email,
            amount: String(total.amountMinor),
            currency: "ZAR",
            reference,
            callback_url: paystackReturnUrl(),
            metadata: { checkoutSessionId: input.checkoutSessionId },
          }),
        },
        "paystack-initialize",
      );
      initialized = parsePaystackInitializeResponse(payload);
      if (initialized.reference !== reference)
        throw new AppError({
          code: "provider_unavailable",
          source: "firebase-functions/paystack-initialize",
          message: "Paystack returned a different payment reference.",
          userMessage: "Secure payment could not be matched to this checkout.",
        });
      initialized = {
        ...initialized,
        authorizationUrl: requirePaystackAuthorizationUrl(
          initialized.authorizationUrl,
        ),
      };
    } catch (error) {
      await database
        .runTransaction(async (transaction) => {
          const currentSnapshot = await transaction.get(sessionReference);
          if (!currentSnapshot.exists) return;
          const current = asRecord(currentSnapshot.data());
          if (
            current.paymentInitializationAttemptId !==
              initializationAttemptId ||
            typeof current.paystackAuthorizationUrl === "string"
          )
            return;
          transaction.update(sessionReference, {
            status: "quoted",
            paymentFailureReason: "initialization_failed",
            paymentInitializationAttemptId: FieldValue.delete(),
            updatedAt: Timestamp.now(),
            updatedBy: "system",
          });
        })
        .catch(() => undefined);
      throwAppError(error);
    }
    let authorizationUrl = initialized.authorizationUrl;
    await database.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(sessionReference);
      if (!currentSnapshot.exists)
        throw new HttpsError("not-found", "The checkout session disappeared.");
      const current = asRecord(currentSnapshot.data());
      if (
        typeof current.paystackAuthorizationUrl === "string" &&
        typeof current.paystackReference === "string"
      ) {
        authorizationUrl = current.paystackAuthorizationUrl;
        return;
      }
      if (current.paymentInitializationAttemptId !== initializationAttemptId)
        throw new HttpsError(
          "aborted",
          "Secure payment initialization was superseded. Check payment status before retrying.",
        );
      transaction.update(sessionReference, {
        status: "payment_pending",
        paystackAuthorizationUrl: initialized.authorizationUrl,
        paymentInitializationAttemptId: FieldValue.delete(),
        updatedAt: Timestamp.now(),
        updatedBy: actor.uid,
      });
    });
    return {
      checkoutSessionId: input.checkoutSessionId,
      reference,
      authorizationUrl,
      quoteExpiresAt: asString(
        session.quoteExpiresAt,
        "The checkout quote expiry is invalid.",
      ),
    };
  },
);

export const verifyPaystackPayment = onCall(
  { region: functionRegion, secrets: [paystackSecret] },
  async (request): Promise<PaystackPaymentVerification> => {
    const actor = await requireActor(request);
    requireCommand(actor, "verifyPaystackPayment");
    const input = parseInput(verifyPaystackPaymentInputSchema, request.data);
    const sessionSnapshot = await database
      .collection("checkoutSessions")
      .doc(input.checkoutSessionId)
      .get();
    if (!sessionSnapshot.exists)
      throw new HttpsError("not-found", "The checkout session does not exist.");
    const session = asRecord(sessionSnapshot.data());
    if (session.customerId !== actor.uid)
      throw new HttpsError(
        "permission-denied",
        "The checkout session belongs to another customer.",
      );
    if (session.status === "consumed" && typeof session.orderId === "string")
      return {
        checkoutSessionId: input.checkoutSessionId,
        status: "paid",
        orderId: session.orderId,
      };
    const reference = asString(
      session.paystackReference,
      "Payment has not been initialized for this checkout.",
    );
    let secret: string;
    try {
      secret = requirePaystackSecretForEnvironment(
        paystackSecret.value(),
        process.env.SPACEMAN_ENVIRONMENT,
      );
    } catch (error) {
      throwAppError(error);
    }
    const verified = await verifyWithPaystack(reference, secret);
    return reconcileVerifiedPayment({
      checkoutSessionId: input.checkoutSessionId,
      provider: verified.data,
      payloadHash: verified.payloadHash,
    });
  },
);

export const handlePaystackWebhook = onRequest(
  { region: functionRegion, secrets: [paystackSecret] },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }
    let secret: string;
    try {
      secret = requirePaystackSecretForEnvironment(
        paystackSecret.value(),
        process.env.SPACEMAN_ENVIRONMENT,
      );
    } catch {
      response.status(503).json({ error: "payment_not_configured" });
      return;
    }
    if (
      !verifyPaystackSignature(
        request.rawBody,
        request.header("x-paystack-signature") ?? undefined,
        secret,
      )
    ) {
      response.status(401).json({ error: "invalid_signature" });
      return;
    }
    const parsed = paystackWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_payload" });
      return;
    }
    if (parsed.data.event !== "charge.success") {
      response.status(200).json({ received: true, reconciled: false });
      return;
    }
    const reference = parsed.data.data.reference;
    if (!reference.startsWith("spc_checkout-")) {
      response.status(200).json({ received: true, reconciled: false });
      return;
    }
    const checkoutSessionId = reference.slice("spc_".length);
    const sessionSnapshot = await database
      .collection("checkoutSessions")
      .doc(checkoutSessionId)
      .get();
    if (!sessionSnapshot.exists) {
      response.status(200).json({ received: true, reconciled: false });
      return;
    }
    try {
      const verified = await verifyWithPaystack(reference, secret);
      const result = await reconcileVerifiedPayment({
        checkoutSessionId,
        provider: verified.data,
        payloadHash: verified.payloadHash,
      });
      response.status(200).json({
        received: true,
        reconciled: true,
        status: result.status,
      });
    } catch (error) {
      logger.error("Paystack webhook reconciliation failed", {
        checkoutSessionId,
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({ error: "processing_failed" });
    }
  },
);

export const paystackPaymentReturn = onRequest(
  { region: functionRegion },
  (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.status(405).send("Method not allowed");
      return;
    }
    response
      .set("Content-Type", "text/html; charset=utf-8")
      .set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      )
      .status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Return to Spaceman</title>
    <style>body{font-family:system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:1.5rem;color:#10202b}a{color:#176b87}</style>
  </head>
  <body>
    <h1>Payment submitted</h1>
    <p>Return to Spaceman and use <strong>Check payment</strong>. This page does not mark a payment successful.</p>
  </body>
</html>`);
  },
);
