import {
  APP_ROLES,
  ASSIGNMENT_STATUSES,
  FULFILLMENT_STATUSES,
  NEEDS_ACTION_REASONS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  USER_STATUSES
} from "@spaceman/app-core";
import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(128);
export const testRunIdSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const appRoleSchema = z.enum(APP_ROLES);
export const userStatusSchema = z.enum(USER_STATUSES);
export const fulfillmentStatusSchema = z.enum(FULFILLMENT_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const refundStatusSchema = z.enum(REFUND_STATUSES);
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export const needsActionReasonSchema = z.enum(NEEDS_ACTION_REASONS);

export const moneySchema = z.object({
  amountMinor: z.number().int().safe(),
  currency: z.literal("ZAR")
});

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const deliveryAddressSchema = z.object({
  label: z.string().trim().min(1).max(120),
  formattedAddress: z.string().trim().min(1).max(500),
  coordinates: coordinatesSchema,
  placeId: z.string().trim().min(1).max(256).optional(),
  instructions: z.string().trim().max(500).optional()
});

export const roleScopeSchema = z.object({
  storeIds: z.array(idSchema).max(100),
  deliveryZoneIds: z.array(idSchema).max(100),
  regionIds: z.array(idSchema).max(100)
});

export const staffRoleSchema = z.enum(["merchant", "driver", "admin"]);
export const storeStatusSchema = z.enum(["draft", "active", "suspended", "archived"]);
export const itemStatusSchema = z.enum(["draft", "active", "hidden", "archived"]);
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{6,14}$/);
export const emailAddressSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8).max(128);

export const bootstrapCustomerProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  phoneE164: phoneE164Schema.optional()
});

export const customerRegistrationInputSchema = bootstrapCustomerProfileInputSchema.extend({
  email: emailAddressSchema,
  password: passwordSchema
});

export const createStaffUserInputSchema = z.object({
  email: emailAddressSchema,
  displayName: z.string().trim().min(1).max(120),
  role: staffRoleSchema,
  scope: roleScopeSchema,
  phoneE164: phoneE164Schema.optional()
});

export const updateUserStatusInputSchema = z.object({
  userId: idSchema,
  status: userStatusSchema
});

export const updateUserScopeInputSchema = z.object({
  userId: idSchema,
  scope: roleScopeSchema
});

export const upsertStoreInputSchema = z.object({
  storeId: idSchema.optional(),
  merchantId: idSchema,
  name: z.string().trim().min(1).max(160),
  status: storeStatusSchema,
  deliveryZoneIds: z.array(idSchema).min(1).max(100),
  address: deliveryAddressSchema,
  imageUrl: z.string().url().max(2_048).optional()
});

export const upsertItemInputSchema = z.object({
  itemId: idSchema.optional(),
  storeId: idSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  status: itemStatusSchema,
  price: moneySchema.refine((value) => value.amountMinor >= 0, {
    message: "Item price must not be negative."
  }),
  imageUrl: z.string().url().max(2_048).optional(),
  categoryId: idSchema.optional()
});

export const retireCatalogItemInputSchema = z.object({
  itemId: idSchema
});

export const refundRequestInputSchema = z.object({
  orderId: idSchema,
  reason: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().safe().optional()
});

export const archiveOrRedactAccountInputSchema = z.object({
  userId: idSchema,
  mode: z.enum(["archive", "redact"]),
  reason: z.string().trim().min(1).max(500)
});

export const checkoutLineInputSchema = z.object({
  itemId: idSchema,
  quantity: z.number().int().min(1).max(99)
});

export const createCheckoutSessionInputSchema = z.object({
  storeId: idSchema,
  lines: z.array(checkoutLineInputSchema).min(1).max(50),
  deliveryAddress: deliveryAddressSchema
});

export const fulfillmentTransitionInputSchema = z.object({
  orderId: idSchema,
  expectedCurrentStatus: fulfillmentStatusSchema,
  nextStatus: fulfillmentStatusSchema,
  reason: z.string().trim().min(1).max(500).optional()
});

export const driverAssignmentInputSchema = z.object({
  orderId: idSchema,
  driverId: idSchema,
  expectedVersion: z.number().int().nonnegative()
});

export const driverLocationInputSchema = z.object({
  orderId: idSchema,
  coordinates: coordinatesSchema,
  capturedAt: z.string().datetime({ offset: true })
});

export const paystackWebhookSchema = z.object({
  event: z.string().trim().min(1).max(120),
  data: z.object({
    id: z.union([z.number().int(), z.string()]),
    reference: z.string().trim().min(1).max(256),
    status: z.string().trim().min(1).max(120),
    amount: z.number().int().nonnegative().optional(),
    currency: z.string().trim().min(3).max(3).optional()
  }).passthrough()
}).passthrough();

export const testFixtureMutationInputSchema = z.object({
  testRunId: testRunIdSchema,
  count: z.number().int().min(1).max(25).default(1)
});

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown
): z.output<TSchema> {
  return schema.parse(value);
}
