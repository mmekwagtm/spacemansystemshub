import {
  APP_ROLES,
  ASSIGNMENT_STATUSES,
  FULFILLMENT_STATUSES,
  NEEDS_ACTION_REASONS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  USER_STATUSES,
} from "@spaceman/app-core";
import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(128);
export const testRunIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const appRoleSchema = z.enum(APP_ROLES);
export const userStatusSchema = z.enum(USER_STATUSES);
export const fulfillmentStatusSchema = z.enum(FULFILLMENT_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const refundStatusSchema = z.enum(REFUND_STATUSES);
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export const needsActionReasonSchema = z.enum(NEEDS_ACTION_REASONS);

export const moneySchema = z.object({
  amountMinor: z.number().int().safe(),
  currency: z.literal("ZAR"),
});

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const deliveryAddressSchema = z.object({
  label: z.string().trim().min(1).max(120),
  formattedAddress: z.string().trim().min(1).max(500),
  coordinates: coordinatesSchema,
  placeId: z.string().trim().min(1).max(256).optional(),
  countryCode: z.literal("ZA").optional(),
  locality: z.string().trim().min(1).max(160).optional(),
  instructions: z.string().trim().max(500).optional(),
});

export const roleScopeSchema = z.object({
  storeIds: z.array(idSchema).max(100),
  deliveryZoneIds: z.array(idSchema).max(100),
  regionIds: z.array(idSchema).max(100),
});

export const staffRoleSchema = z.enum(["merchant", "driver", "admin"]);
export const storeStatusSchema = z.enum([
  "draft",
  "active",
  "suspended",
  "archived",
]);
export const itemStatusSchema = z.enum([
  "draft",
  "active",
  "hidden",
  "archived",
]);
export const storeApprovalStateSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
export const catalogSourceSchema = z.enum([
  "manual",
  "merchant",
  "google_places",
  "catalog_csv",
]);
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{6,14}$/);
export const emailAddressSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8).max(128);

export const bootstrapCustomerProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  phoneE164: phoneE164Schema.optional(),
});

export const customerRegistrationInputSchema =
  bootstrapCustomerProfileInputSchema.extend({
    email: emailAddressSchema,
    password: passwordSchema,
  });

export const createStaffUserInputSchema = z.object({
  email: emailAddressSchema,
  displayName: z.string().trim().min(1).max(120),
  role: staffRoleSchema,
  scope: roleScopeSchema,
  phoneE164: phoneE164Schema.optional(),
});

export const updateUserStatusInputSchema = z.object({
  userId: idSchema,
  status: userStatusSchema,
});

export const updateUserScopeInputSchema = z.object({
  userId: idSchema,
  scope: roleScopeSchema,
});

export const catalogMediaSchema = z.object({
  sourcePath: z.string().trim().min(1).max(512),
  thumbnailPath: z.string().trim().min(1).max(512),
  altText: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5_000_000),
  sourceUrl: z.string().url().max(2_048).optional(),
  thumbnailUrl: z.string().url().max(2_048).optional(),
  attribution: z.string().trim().max(500).optional(),
});

export const openingHoursPeriodSchema = z
  .object({
    day: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    closed: z.boolean(),
    opensAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    closesAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (
      !value.closed &&
      (value.opensAt === undefined || value.closesAt === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Open days require opening and closing times.",
      });
    }
  });

export const openingHoursSchema = z
  .array(openingHoursPeriodSchema)
  .max(7)
  .refine((periods) => new Set(periods.map((period) => period.day)).size === periods.length)
  .default([]);

const storeFieldsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000),
  address: deliveryAddressSchema,
  openingHours: openingHoursSchema,
  minimumOrder: moneySchema.refine((value) => value.amountMinor >= 0, {
    message: "Minimum order must not be negative.",
  }),
  cardMedia: catalogMediaSchema.optional(),
  heroMedia: catalogMediaSchema.optional(),
});

export const upsertStoreInputSchema = z.object({
  storeId: idSchema.optional(),
  merchantId: idSchema,
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120).default("General"),
  description: z.string().trim().max(2_000).default(""),
  status: storeStatusSchema,
  deliveryZoneIds: z.array(idSchema).min(1).max(100),
  address: deliveryAddressSchema,
  openingHours: openingHoursSchema,
  openForOrders: z.boolean().default(false),
  minimumOrder: moneySchema.default({ amountMinor: 0, currency: "ZAR" }),
  cardMedia: catalogMediaSchema.optional(),
  heroMedia: catalogMediaSchema.optional(),
  imageUrl: z.string().url().max(2_048).optional(),
});

export const submitMerchantStoreInputSchema = storeFieldsSchema.extend({
  storeId: idSchema.optional(),
});

export const reviewStoreSubmissionInputSchema = z.object({
  storeId: idSchema,
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(1).max(500).optional(),
  deliveryZoneIds: z.array(idSchema).min(1).max(100).optional(),
});

export const updateMerchantStoreInputSchema = storeFieldsSchema
  .omit({ address: true })
  .extend({
    storeId: idSchema,
    openForOrders: z.boolean(),
  });

export const upsertItemInputSchema = z.object({
  itemId: idSchema.optional(),
  storeId: idSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  status: itemStatusSchema,
  price: moneySchema.refine((value) => value.amountMinor >= 0, {
    message: "Item price must not be negative.",
  }),
  available: z.boolean().default(true),
  categoryLabel: z.string().trim().min(1).max(120).default("General"),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  source: z.enum(["manual", "merchant", "catalog_csv"]).default("manual"),
  sourceId: z.string().trim().min(1).max(256).optional(),
  importBatchId: idSchema.optional(),
  imageAlt: z.string().trim().max(240).default(""),
  media: catalogMediaSchema.optional(),
  imageUrl: z.string().url().max(2_048).optional(),
  categoryId: idSchema.optional(),
});

export const setItemAvailabilityInputSchema = z.object({
  itemId: idSchema,
  available: z.boolean(),
});

export const retireCatalogItemInputSchema = z.object({
  itemId: idSchema,
});

export const storePlaceSearchInputSchema = z.object({
  query: z.string().trim().min(3).max(200),
  sessionToken: z.string().trim().min(8).max(128).optional(),
});

export const stageGoogleStoreImportInputSchema = z.object({
  placeId: z.string().trim().min(1).max(256),
  merchantId: idSchema,
});

export const stageCsvCatalogImportInputSchema = z.object({
  storeId: idSchema,
  csv: z.string().min(1).max(1_000_000),
});

export const commitCatalogImportInputSchema = z.object({
  batchId: idSchema,
  selectedRowIds: z.array(idSchema).min(1).max(500),
});

export const cancelCatalogImportInputSchema = z.object({
  batchId: idSchema,
});

export const cleanupCatalogMediaInputSchema = z.object({
  storeId: idSchema,
  sourcePath: z.string().trim().min(1).max(512),
  thumbnailPath: z.string().trim().min(1).max(512),
});

export const catalogPageRequestSchema = z.object({
  cursor: idSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
  category: z.string().trim().min(1).max(120).optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .transform(normalizeSearchText)
    .optional(),
});

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("en-ZA").replace(/\s+/g, " ");
}

export const refundRequestInputSchema = z.object({
  orderId: idSchema,
  reason: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().safe().optional(),
});

export const archiveOrRedactAccountInputSchema = z.object({
  userId: idSchema,
  mode: z.enum(["archive", "redact"]),
  reason: z.string().trim().min(1).max(500),
});

export const checkoutLineInputSchema = z.object({
  itemId: idSchema,
  quantity: z.number().int().min(1).max(99),
});

export const createCheckoutSessionInputSchema = z.object({
  channel: z.enum(["customer_web", "customer_app"]),
  idempotencyKey: z
    .string()
    .trim()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  storeId: idSchema,
  lines: z.array(checkoutLineInputSchema).min(1).max(50),
  addressSelection: z.object({
    placeId: z.string().trim().min(1).max(256),
    sessionToken: z
      .string()
      .trim()
      .min(16)
      .max(36)
      .regex(/^[A-Za-z0-9_-]+$/),
    label: z.string().trim().min(1).max(120),
    instructions: z.string().trim().max(500).optional(),
  }),
  testRunId: testRunIdSchema.optional(),
});

export const searchDeliveryAddressesInputSchema = z.object({
  storeId: idSchema,
  query: z.string().trim().min(3).max(200),
  sessionToken: z
    .string()
    .trim()
    .min(16)
    .max(36)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const upsertDeliveryZoneInputSchema = z.object({
  deliveryZoneId: idSchema.optional(),
  name: z.string().trim().min(1).max(160),
  active: z.boolean(),
  countryCode: z.literal("ZA"),
  allowedLocalities: z
    .array(z.string().trim().min(1).max(160))
    .min(1)
    .max(50)
    .transform((values) => [...new Set(values)]),
  testRunId: testRunIdSchema.optional(),
});

const nonNegativeMoneySchema = moneySchema.refine(
  (value) => value.amountMinor >= 0,
  { message: "Money values must not be negative." },
);

export const publishDeliveryFeeRuleInputSchema = z
  .object({
    deliveryZoneId: idSchema,
    name: z.string().trim().min(1).max(160),
    deliveryType: z.literal("standard"),
    baseFee: nonNegativeMoneySchema,
    includedDistanceMetres: z.number().int().min(0).max(100_000),
    perKilometreFee: nonNegativeMoneySchema,
    smallOrderThreshold: nonNegativeMoneySchema,
    smallOrderSurcharge: nonNegativeMoneySchema,
    minimumFee: nonNegativeMoneySchema,
    maximumFee: nonNegativeMoneySchema,
    effectiveFrom: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(500).optional(),
    testRunId: testRunIdSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.minimumFee.amountMinor > value.maximumFee.amountMinor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maximumFee"],
        message: "Maximum fee must be greater than or equal to minimum fee.",
      });
    }
  });

export const updateCheckoutSettingsInputSchema = z.object({
  customerOrderingEnabled: z.boolean(),
  mapsQuoteEnabled: z.boolean(),
  paystackEnabled: z.boolean(),
  testRunId: testRunIdSchema.optional(),
});

export const initializePaystackPaymentInputSchema = z.object({
  checkoutSessionId: idSchema,
});

export const verifyPaystackPaymentInputSchema =
  initializePaystackPaymentInputSchema;

export const fulfillmentTransitionInputSchema = z.object({
  orderId: idSchema,
  expectedCurrentStatus: fulfillmentStatusSchema,
  nextStatus: fulfillmentStatusSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const driverAssignmentInputSchema = z.object({
  orderId: idSchema,
  driverId: idSchema,
  expectedVersion: z.number().int().nonnegative(),
});

export const driverLocationInputSchema = z.object({
  orderId: idSchema,
  coordinates: coordinatesSchema,
  capturedAt: z.string().datetime({ offset: true }),
});

export const paystackWebhookSchema = z
  .object({
    event: z.string().trim().min(1).max(120),
    data: z
      .object({
        id: z.union([z.number().int(), z.string()]),
        reference: z.string().trim().min(1).max(256),
        status: z.string().trim().min(1).max(120),
        amount: z.number().int().nonnegative().optional(),
        currency: z.string().trim().min(3).max(3).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const testFixtureMutationInputSchema = z.object({
  testRunId: testRunIdSchema,
  count: z.number().int().min(1).max(25).default(1),
});

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): z.output<TSchema> {
  return schema.parse(value);
}
