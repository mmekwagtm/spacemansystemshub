import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  FULFILLMENT_STATUSES,
  isAppRole,
  type AppRole,
  type FulfillmentStatus
} from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import {
  assertAccountArchiveTarget,
  assertAssignmentVersion,
  assertForegroundLocationEligibility,
  assertFulfillmentTransition,
  assertRefundReviewAllowed,
  assertStoreScope,
  assertTrustedCommandAccess,
  assertUserManagementScope,
  decidePaystackWebhookAction
} from "@spaceman/app-functions";
import {
  archiveOrRedactAccountInputSchema,
  createStaffUserInputSchema,
  createCheckoutSessionInputSchema,
  driverAssignmentInputSchema,
  driverLocationInputSchema,
  fulfillmentTransitionInputSchema,
  paystackWebhookSchema,
  refundRequestInputSchema,
  retireCatalogItemInputSchema,
  testFixtureMutationInputSchema,
  updateUserScopeInputSchema,
  updateUserStatusInputSchema,
  upsertItemInputSchema,
  upsertStoreInputSchema
} from "@spaceman/app-validation";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

if (getApps().length === 0) {
  initializeApp();
}

const database = getFirestore();
const authentication = getAuth();
const paystackSecret = defineSecret("PAYSTACK_SECRET_KEY");
const functionRegion = process.env.SPACEMAN_FUNCTIONS_REGION ?? "us-central1";

type Actor = {
  uid: string;
  role: AppRole;
  storeIds: string[];
};

type SafeParseResult<TOutput> =
  | { success: true; data: TOutput }
  | { success: false; error: { flatten(): unknown } };

interface SafeParseSchema<TOutput> {
  safeParse(value: unknown): SafeParseResult<TOutput>;
}

function parseCallableInput<TOutput>(schema: SafeParseSchema<TOutput>, data: unknown): TOutput {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "The request input is invalid.", parsed.error.flatten());
  }
  return parsed.data;
}

function requireActiveActor(request: { auth?: { uid: string; token: Record<string, unknown> } | null }): Actor {
  if (request.auth === null || request.auth === undefined) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const roleValue = request.auth.token.role;
  const statusValue = request.auth.token.status;
  if (typeof roleValue !== "string" || !isAppRole(roleValue) || statusValue !== "active") {
    throw new HttpsError("permission-denied", "An active platform role is required.");
  }

  const storeIds = Array.isArray(request.auth.token.storeIds)
    ? request.auth.token.storeIds.filter((value): value is string => typeof value === "string")
    : [];

  return { uid: request.auth.uid, role: roleValue, storeIds };
}

function requireTrustedCommand(actor: Actor, command: Parameters<typeof assertTrustedCommandAccess>[0]): void {
  try {
    assertTrustedCommandAccess(command, actor.role);
  } catch (error) {
    if (error instanceof AppError) {
      throw new HttpsError("permission-denied", error.userMessage);
    }
    throw error;
  }
}

function asFulfillmentStatus(value: unknown): FulfillmentStatus {
  if (typeof value !== "string" || !FULFILLMENT_STATUSES.includes(value as FulfillmentStatus)) {
    throw new HttpsError("failed-precondition", "The order has an invalid fulfillment state.");
  }
  return value as FulfillmentStatus;
}

function asAppRole(value: unknown): AppRole {
  if (typeof value !== "string" || !isAppRole(value)) {
    throw new HttpsError("failed-precondition", "The user profile has an invalid role.");
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("failed-precondition", "The stored order has an invalid structure.");
  }
  return value as Record<string, unknown>;
}

function ensureMerchantScope(actor: Actor, storeId: unknown): void {
  if (typeof storeId !== "string") {
    throw new HttpsError("failed-precondition", "The stored record has no valid store scope.");
  }

  try {
    assertStoreScope(actor.role, actor.storeIds, storeId);
  } catch (error) {
    if (error instanceof AppError) {
      throw new HttpsError("permission-denied", error.userMessage);
    }
    throw error;
  }
}

function assertUserManagement(actor: Actor, targetRole: AppRole): void {
  try {
    assertUserManagementScope(actor.role, targetRole);
  } catch (error) {
    if (error instanceof AppError) {
      throw new HttpsError("permission-denied", error.userMessage);
    }
    throw error;
  }
}

function claimsForProfile(
  role: AppRole,
  status: string,
  scope: { storeIds?: unknown; deliveryZoneIds?: unknown; regionIds?: unknown }
): Record<string, unknown> {
  return {
    role,
    status,
    storeIds: Array.isArray(scope.storeIds) ? scope.storeIds : [],
    deliveryZoneIds: Array.isArray(scope.deliveryZoneIds) ? scope.deliveryZoneIds : [],
    regionIds: Array.isArray(scope.regionIds) ? scope.regionIds : []
  };
}

function ensureDevelopmentEnvironment(): void {
  if (process.env.SPACEMAN_ENVIRONMENT !== "development") {
    throw new HttpsError("failed-precondition", "Test fixtures are available only in the development project.");
  }
}

export const healthcheck = onCall({ region: functionRegion }, (request) => {
  const actor = requireActiveActor(request);
  return {
    actorRole: actor.role,
    environment: process.env.SPACEMAN_ENVIRONMENT ?? "unconfigured",
    status: "ready_for_configuration"
  };
});

export const createStaffUser = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "createStaffUser");
  const input = parseCallableInput(createStaffUserInputSchema, request.data);
  const account = await authentication.createUser({
    email: input.email,
    displayName: input.displayName,
    disabled: false
  });
  const profileReference = database.collection("users").doc(account.uid);

  try {
    await authentication.setCustomUserClaims(
      account.uid,
      claimsForProfile(input.role, "invited", input.scope)
    );
    await profileReference.create({
      id: account.uid,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: "invited",
      scope: input.scope,
      ...(input.phoneE164 === undefined ? {} : { phoneE164: input.phoneE164 }),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  } catch {
    await authentication.deleteUser(account.uid).catch(() => undefined);
    logger.error("Staff account provisioning failed", { actorId: actor.uid, staffUserId: account.uid });
    throw new HttpsError("internal", "The staff account could not be provisioned.");
  }

  return { id: account.uid, acceptedAt: new Date().toISOString() };
});

export const updateUserStatus = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "updateUserStatus");
  const input = parseCallableInput(updateUserStatusInputSchema, request.data);
  const profileReference = database.collection("users").doc(input.userId);
  const profileSnapshot = await profileReference.get();
  if (!profileSnapshot.exists) {
    throw new HttpsError("not-found", "The user profile does not exist.");
  }

  const profile = asRecord(profileSnapshot.data());
  const targetRole = asAppRole(profile.role);
  assertUserManagement(actor, targetRole);
  const scope = asRecord(profile.scope);
  const account = await authentication.getUser(input.userId);
  const disabled = input.status === "suspended" || input.status === "archived";

  await Promise.all([
    profileReference.update({
      status: input.status,
      ...(input.status === "archived" ? { archivedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    }),
    authentication.updateUser(input.userId, { disabled }),
    authentication.setCustomUserClaims(input.userId, {
      ...(account.customClaims ?? {}),
      ...claimsForProfile(targetRole, input.status, scope)
    })
  ]);

  return { id: input.userId, acceptedAt: new Date().toISOString() };
});

export const updateUserScope = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "updateUserScope");
  const input = parseCallableInput(updateUserScopeInputSchema, request.data);
  const profileReference = database.collection("users").doc(input.userId);
  const profileSnapshot = await profileReference.get();
  if (!profileSnapshot.exists) {
    throw new HttpsError("not-found", "The user profile does not exist.");
  }

  const profile = asRecord(profileSnapshot.data());
  const targetRole = asAppRole(profile.role);
  assertUserManagement(actor, targetRole);
  const status = typeof profile.status === "string" ? profile.status : "pending_profile";
  const account = await authentication.getUser(input.userId);

  await Promise.all([
    profileReference.update({
      scope: input.scope,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    }),
    authentication.setCustomUserClaims(input.userId, {
      ...(account.customClaims ?? {}),
      ...claimsForProfile(targetRole, status, input.scope)
    })
  ]);

  return { id: input.userId, acceptedAt: new Date().toISOString() };
});

export const createCheckoutSession = onCall({ region: functionRegion }, (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "createCheckoutSession");
  parseCallableInput(createCheckoutSessionInputSchema, request.data);

  // A caller cannot supply an address fee or serviceability result. Until the server-side
  // Google Maps adapter and fee rules are configured, checkout must remain fail-closed.
  throw new HttpsError(
    "failed-precondition",
    "Delivery quote verification is not configured for this development project."
  );
});

export const upsertStore = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "upsertStore");
  const input = parseCallableInput(upsertStoreInputSchema, request.data);
  const storeReference = input.storeId === undefined
    ? database.collection("stores").doc()
    : database.collection("stores").doc(input.storeId);
  const existingSnapshot = await storeReference.get();
  const existing = existingSnapshot.exists ? asRecord(existingSnapshot.data()) : null;

  if (actor.role === "merchant") {
    if (input.merchantId !== actor.uid) {
      throw new HttpsError("permission-denied", "Merchants may create stores only for themselves.");
    }
    if (existing !== null) {
      ensureMerchantScope(actor, storeReference.id);
      if (existing.merchantId !== actor.uid) {
        throw new HttpsError("permission-denied", "This store belongs to another merchant.");
      }
      if (existing.status !== input.status) {
        throw new HttpsError("permission-denied", "Merchants cannot change store approval status.");
      }
    } else if (input.status !== "draft") {
      throw new HttpsError("permission-denied", "New merchant stores must begin as drafts.");
    }
  }

  const auditReference = database.collection("auditLogs").doc();
  const batch = database.batch();
  batch.set(
    storeReference,
    {
      id: storeReference.id,
      merchantId: input.merchantId,
      name: input.name,
      status: input.status,
      deliveryZoneIds: input.deliveryZoneIds,
      address: input.address,
      ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
      ...(existing === null
        ? { createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    },
    { merge: true }
  );
  batch.set(auditReference, {
    id: auditReference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    action: existing === null ? "store_created" : "store_updated",
    targetType: "store",
    targetId: storeReference.id,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  await batch.commit();

  return { id: storeReference.id, acceptedAt: new Date().toISOString() };
});

export const upsertItem = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "upsertItem");
  const input = parseCallableInput(upsertItemInputSchema, request.data);
  const storeSnapshot = await database.collection("stores").doc(input.storeId).get();
  if (!storeSnapshot.exists) {
    throw new HttpsError("not-found", "The item store does not exist.");
  }
  ensureMerchantScope(actor, input.storeId);
  const itemReference = input.itemId === undefined
    ? database.collection("items").doc()
    : database.collection("items").doc(input.itemId);
  const existingSnapshot = await itemReference.get();
  const existing = existingSnapshot.exists ? asRecord(existingSnapshot.data()) : null;
  if (existing !== null && existing.storeId !== input.storeId) {
    throw new HttpsError("failed-precondition", "Items cannot move between stores through an upsert.");
  }

  const auditReference = database.collection("auditLogs").doc();
  const batch = database.batch();
  batch.set(
    itemReference,
    {
      id: itemReference.id,
      storeId: input.storeId,
      name: input.name,
      status: input.status,
      price: input.price,
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(existing === null
        ? { createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    },
    { merge: true }
  );
  batch.set(auditReference, {
    id: auditReference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    action: existing === null ? "item_created" : "item_updated",
    targetType: "item",
    targetId: itemReference.id,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  await batch.commit();

  return { id: itemReference.id, acceptedAt: new Date().toISOString() };
});

export const retireCatalogItem = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "retireCatalogItem");
  const input = parseCallableInput(retireCatalogItemInputSchema, request.data);
  const itemReference = database.collection("items").doc(input.itemId);
  const itemSnapshot = await itemReference.get();
  if (!itemSnapshot.exists) {
    throw new HttpsError("not-found", "The catalog item does not exist.");
  }

  const item = asRecord(itemSnapshot.data());
  ensureMerchantScope(actor, item.storeId);
  const auditReference = database.collection("auditLogs").doc();
  const batch = database.batch();
  batch.update(itemReference, {
    status: "archived",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  batch.set(auditReference, {
    id: auditReference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    action: "item_retired",
    targetType: "item",
    targetId: input.itemId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  await batch.commit();

  return { id: input.itemId, acceptedAt: new Date().toISOString() };
});

export const transitionMerchantFulfillment = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "transitionMerchantFulfillment");
  const input = parseCallableInput(fulfillmentTransitionInputSchema, request.data);
  const orderReference = database.collection("orders").doc(input.orderId);

  await database.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderReference);
    if (!orderSnapshot.exists) {
      throw new HttpsError("not-found", "The order does not exist.");
    }

    const order = asRecord(orderSnapshot.data());
    ensureMerchantScope(actor, order.storeId);
    const fulfillment = asRecord(order.fulfillment);
    const currentStatus = asFulfillmentStatus(fulfillment.status);
    if (currentStatus !== input.expectedCurrentStatus) {
      throw new HttpsError("aborted", "The order changed before the transition could be applied.");
    }

    try {
      assertFulfillmentTransition(actor.role, currentStatus, input.nextStatus);
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError("permission-denied", error.userMessage);
      }
      throw error;
    }

    const eventReference = database.collection("orderEvents").doc();
    transaction.update(orderReference, {
      "fulfillment.status": input.nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
    transaction.create(eventReference, {
      id: eventReference.id,
      orderId: input.orderId,
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "fulfillment_transition",
      previousFulfillmentStatus: currentStatus,
      nextFulfillmentStatus: input.nextStatus,
      ...(input.reason === undefined ? {} : { detail: input.reason }),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  });

  return { id: input.orderId, acceptedAt: new Date().toISOString() };
});

export const assignDriver = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "assignDriver");
  const input = parseCallableInput(driverAssignmentInputSchema, request.data);
  const orderReference = database.collection("orders").doc(input.orderId);
  const assignmentReference = database.collection("driverAssignments").doc(input.orderId);
  const driverReference = database.collection("users").doc(input.driverId);

  await database.runTransaction(async (transaction) => {
    const [orderSnapshot, assignmentSnapshot, driverSnapshot] = await Promise.all([
      transaction.get(orderReference),
      transaction.get(assignmentReference),
      transaction.get(driverReference)
    ]);
    if (!orderSnapshot.exists) {
      throw new HttpsError("not-found", "The order does not exist.");
    }
    if (!driverSnapshot.exists) {
      throw new HttpsError("not-found", "The selected driver profile does not exist.");
    }

    const order = asRecord(orderSnapshot.data());
    const assignment = assignmentSnapshot.exists ? asRecord(assignmentSnapshot.data()) : {};
    const driver = asRecord(driverSnapshot.data());
    if (driver.role !== "driver" || driver.status !== "active") {
      throw new HttpsError("failed-precondition", "The selected user is not an active driver.");
    }
    const currentVersion = typeof assignment.version === "number" ? assignment.version : 0;
    try {
      assertAssignmentVersion(input.expectedVersion, currentVersion);
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError("aborted", error.userMessage);
      }
      throw error;
    }

    const nextVersion = currentVersion + 1;
    transaction.set(assignmentReference, {
      id: assignmentReference.id,
      orderId: input.orderId,
      storeId: order.storeId,
      driverId: input.driverId,
      assignmentStatus: "assigned",
      version: nextVersion,
      ...(assignmentSnapshot.exists && assignment.createdAt !== undefined
        ? { createdAt: assignment.createdAt }
        : { createdAt: FieldValue.serverTimestamp() }),
      ...(assignmentSnapshot.exists && assignment.createdBy !== undefined
        ? { createdBy: assignment.createdBy }
        : { createdBy: actor.uid }),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
    transaction.update(orderReference, {
      assignment: {
        status: "assigned",
        version: nextVersion,
        driverId: input.driverId,
        assignedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  });

  return { id: input.orderId, acceptedAt: new Date().toISOString() };
});

export const updateDriverLocation = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "updateDriverLocation");
  const input = parseCallableInput(driverLocationInputSchema, request.data);
  const orderReference = database.collection("orders").doc(input.orderId);
  const assignmentReference = database.collection("driverAssignments").doc(input.orderId);

  await database.runTransaction(async (transaction) => {
    const [orderSnapshot, assignmentSnapshot] = await Promise.all([
      transaction.get(orderReference),
      transaction.get(assignmentReference)
    ]);
    if (!orderSnapshot.exists || !assignmentSnapshot.exists) {
      throw new HttpsError("failed-precondition", "An active delivery assignment is required.");
    }

    const order = asRecord(orderSnapshot.data());
    const assignment = asRecord(assignmentSnapshot.data());
    const fulfillment = asRecord(order.fulfillment);
    try {
      assertForegroundLocationEligibility(actor.uid, assignment.driverId, fulfillment.status);
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError("permission-denied", error.userMessage);
      }
      throw error;
    }

    const locationReference = database.collection("driverLocations").doc(input.orderId);
    transaction.set(locationReference, {
      id: locationReference.id,
      orderId: input.orderId,
      customerId: order.customerId,
      storeId: order.storeId,
      driverId: actor.uid,
      coordinates: input.coordinates,
      capturedAt: input.capturedAt,
      source: "foreground_active_delivery",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  });

  return { id: input.orderId, acceptedAt: new Date().toISOString() };
});

export const requestRefund = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "requestRefund");
  const input = parseCallableInput(refundRequestInputSchema, request.data);
  const orderReference = database.collection("orders").doc(input.orderId);

  await database.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderReference);
    if (!orderSnapshot.exists) {
      throw new HttpsError("not-found", "The order does not exist.");
    }

    const order = asRecord(orderSnapshot.data());
    const payment = asRecord(order.payment);
    const total = asRecord(order.total);
    const totalAmount = typeof total.amountMinor === "number" ? total.amountMinor : null;
    if (totalAmount === null || typeof total.currency !== "string") {
      throw new HttpsError("failed-precondition", "The order has an invalid total.");
    }
    const requestedAmount = input.amountMinor ?? totalAmount;
    try {
      assertRefundReviewAllowed({
        paymentStatus: payment.status,
        refundStatus: payment.refundStatus,
        totalAmountMinor: totalAmount,
        requestedAmountMinor: requestedAmount
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError(
          error.code === "invalid_input" ? "invalid-argument" : "failed-precondition",
          error.userMessage
        );
      }
      throw error;
    }

    const currentNeedsAction = order.needsAction === undefined ? {} : asRecord(order.needsAction);
    const currentReasons = Array.isArray(currentNeedsAction.reasons)
      ? currentNeedsAction.reasons.filter((reason): reason is string => typeof reason === "string")
      : [];
    const reasons = [...new Set([...currentReasons.filter((reason) => reason !== "none"), "refund_review"])];
    const activityReference = database.collection("activities").doc();
    const auditReference = database.collection("auditLogs").doc();

    transaction.update(orderReference, {
      "payment.refundStatus": "requested",
      "payment.refundRequestedAmount": { amountMinor: requestedAmount, currency: total.currency },
      needsAction: {
        reasons,
        updatedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
    transaction.create(activityReference, {
      id: activityReference.id,
      actorId: actor.uid,
      actorRole: actor.role,
      activityType: "refund_requested",
      resourceType: "order",
      resourceId: input.orderId,
      summary: "Refund review requested.",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
    transaction.create(auditReference, {
      id: auditReference.id,
      actorId: actor.uid,
      actorRole: actor.role,
      action: "refund_review_requested",
      targetType: "order",
      targetId: input.orderId,
      detail: { requestedAmountMinor: requestedAmount, reasonProvided: true },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  });

  return { id: input.orderId, acceptedAt: new Date().toISOString() };
});

export const archiveOrRedactAccount = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "archiveOrRedactAccount");
  const input = parseCallableInput(archiveOrRedactAccountInputSchema, request.data);
  try {
    assertAccountArchiveTarget(actor.uid, input.userId);
  } catch (error) {
    if (error instanceof AppError) {
      throw new HttpsError("failed-precondition", error.userMessage);
    }
    throw error;
  }
  const profileReference = database.collection("users").doc(input.userId);
  const profileSnapshot = await profileReference.get();
  if (!profileSnapshot.exists) {
    throw new HttpsError("not-found", "The user profile does not exist.");
  }

  const profile = asRecord(profileSnapshot.data());
  const targetRole = asAppRole(profile.role);
  assertUserManagement(actor, targetRole);
  const account = await authentication.getUser(input.userId);
  const archivedScope = { storeIds: [], deliveryZoneIds: [], regionIds: [] };
  const auditReference = database.collection("auditLogs").doc();
  const activityReference = database.collection("activities").doc();
  const batch = database.batch();

  batch.update(profileReference, {
    status: "archived",
    scope: archivedScope,
    ...(input.mode === "redact"
      ? {
          email: "redacted",
          displayName: "Redacted user",
          phoneE164: FieldValue.delete()
        }
      : {}),
    archivedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  batch.set(activityReference, {
    id: activityReference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    activityType: input.mode === "redact" ? "account_redacted" : "account_archived",
    resourceType: "user",
    resourceId: input.userId,
    summary: input.mode === "redact" ? "Account profile redacted." : "Account archived.",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  batch.set(auditReference, {
    id: auditReference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    action: input.mode === "redact" ? "account_redacted" : "account_archived",
    targetType: "user",
    targetId: input.userId,
    detail: { reasonProvided: true },
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid
  });
  await batch.commit();

  const redactedEmail = `redacted-${input.userId}@redacted.invalid`;
  await Promise.all([
    authentication.updateUser(input.userId, {
      disabled: true,
      ...(input.mode === "redact" ? { displayName: "Redacted user", email: redactedEmail } : {})
    }),
    authentication.setCustomUserClaims(input.userId, {
      ...(account.customClaims ?? {}),
      ...claimsForProfile(targetRole, "archived", archivedScope)
    })
  ]);

  return { id: input.userId, acceptedAt: new Date().toISOString() };
});

export const seedTestFixtures = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "seedTestFixtures");
  ensureDevelopmentEnvironment();
  const input = parseCallableInput(testFixtureMutationInputSchema, request.data);
  const batch = database.batch();

  for (let index = 0; index < input.count; index += 1) {
    const storeReference = database.collection("stores").doc(`test-${input.testRunId}-${index}`);
    batch.set(storeReference, {
      id: storeReference.id,
      merchantId: actor.uid,
      name: `Fixture store ${index + 1}`,
      status: "draft",
      deliveryZoneIds: [],
      testRunId: input.testRunId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    });
  }

  await batch.commit();
  logger.info("Seeded scoped development fixtures", { testRunId: input.testRunId, count: input.count });
  return { id: input.testRunId, acceptedAt: new Date().toISOString() };
});

export const cleanupTestFixtures = onCall({ region: functionRegion }, async (request) => {
  const actor = requireActiveActor(request);
  requireTrustedCommand(actor, "cleanupTestFixtures");
  ensureDevelopmentEnvironment();
  const input = parseCallableInput(testFixtureMutationInputSchema, request.data);
  const collections = [
    "stores",
    "items",
    "checkoutSessions",
    "orders",
    "paymentEvents",
    "orderEvents",
    "driverAssignments",
    "driverLocations",
    "notifications",
    "activities",
    "auditLogs",
    "importBatches",
    "settlements"
  ];
  let deleted = 0;

  for (const collectionName of collections) {
    const snapshots = await database.collection(collectionName).where("testRunId", "==", input.testRunId).limit(250).get();
    if (snapshots.empty) {
      continue;
    }

    const batch = database.batch();
    snapshots.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    await batch.commit();
    deleted += snapshots.size;
  }

  logger.info("Cleaned scoped development fixtures", { testRunId: input.testRunId, deleted });
  return { id: input.testRunId, acceptedAt: new Date().toISOString() };
});

function verifyPaystackSignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (signature === undefined) {
    return false;
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export const handlePaystackWebhook = onRequest(
  { region: functionRegion, secrets: [paystackSecret] },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const secret = paystackSecret.value();
    if (!secret || !verifyPaystackSignature(request.rawBody, request.header("x-paystack-signature") ?? undefined, secret)) {
      response.status(401).json({ error: "invalid_signature" });
      return;
    }

    const parsed = paystackWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_payload" });
      return;
    }

    const payload = parsed.data;
    if (decidePaystackWebhookAction({ event: payload.event, eventAlreadyProcessed: false }) === "ignore") {
      response.status(200).json({ received: true, orderCreated: false });
      return;
    }

    const providerEventId = String(payload.data.id);
    const reference = payload.data.reference;
    const eventReference = database.collection("paymentEvents").doc(`paystack-${providerEventId}`);
    let orderId: string | null = null;

    try {
      await database.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventReference);
        if (eventSnapshot.exists) {
          const action = decidePaystackWebhookAction({
            event: payload.event,
            eventAlreadyProcessed: true
          });
          if (action !== "replay") {
            throw new HttpsError("failed-precondition", "Unexpected webhook replay state.");
          }
          const existing = asRecord(eventSnapshot.data());
          orderId = typeof existing.orderId === "string" ? existing.orderId : null;
          return;
        }

        const sessions = await transaction.get(
          database.collection("checkoutSessions").where("paystackReference", "==", reference).limit(1)
        );
        if (sessions.empty) {
          throw new HttpsError("not-found", "No checkout session matches the verified payment reference.");
        }

        const sessionReference = sessions.docs[0]!.ref;
        const session = asRecord(sessions.docs[0]!.data());
        const checkoutSessionStatus = typeof session.status === "string" ? session.status : undefined;
        try {
          const action = decidePaystackWebhookAction({
            event: payload.event,
            eventAlreadyProcessed: false,
            ...(checkoutSessionStatus === undefined ? {} : { checkoutSessionStatus })
          });
          if (action !== "create_order") {
            throw new HttpsError("failed-precondition", "Unexpected webhook processing state.");
          }
        } catch (error) {
          if (error instanceof AppError) {
            throw new HttpsError("failed-precondition", error.userMessage);
          }
          throw error;
        }

        const orderReference = database.collection("orders").doc();
        const orderEventReference = database.collection("orderEvents").doc();
        const now = FieldValue.serverTimestamp();
        transaction.create(orderReference, {
          id: orderReference.id,
          checkoutSessionId: sessionReference.id,
          customerId: session.customerId,
          storeId: session.storeId,
          lines: session.lines,
          deliveryAddress: session.deliveryAddress,
          itemSubtotal: session.itemSubtotal,
          deliveryFee: session.deliveryFee,
          serviceFee: session.serviceFee,
          total: session.total,
          payment: {
            status: "paid",
            provider: "paystack",
            reference,
            paidAt: now,
            refundStatus: "not_requested"
          },
          fulfillment: { status: "paid" },
          assignment: { status: "unassigned", version: 0 },
          needsAction: { reasons: ["no_driver_assigned"], updatedAt: now },
          ...(typeof session.testRunId === "string" ? { testRunId: session.testRunId } : {}),
          createdAt: now,
          createdBy: "system",
          updatedAt: now,
          updatedBy: "system"
        });
        transaction.create(orderEventReference, {
          id: orderEventReference.id,
          orderId: orderReference.id,
          actorId: "system",
          actorRole: "system",
          eventType: "payment_verified_order_created",
          nextFulfillmentStatus: "paid",
          ...(typeof session.testRunId === "string" ? { testRunId: session.testRunId } : {}),
          createdAt: now,
          createdBy: "system",
          updatedAt: now,
          updatedBy: "system"
        });
        transaction.create(eventReference, {
          id: eventReference.id,
          checkoutSessionId: sessionReference.id,
          orderId: orderReference.id,
          provider: "paystack",
          providerEventId,
          reference,
          status: "paid",
          receivedAt: now,
          payloadHash: createHash("sha256").update(request.rawBody).digest("hex"),
          ...(typeof session.testRunId === "string" ? { testRunId: session.testRunId } : {}),
          createdAt: now,
          createdBy: "system",
          updatedAt: now,
          updatedBy: "system"
        });
        transaction.update(sessionReference, {
          status: "consumed",
          updatedAt: now,
          updatedBy: "system"
        });
        orderId = orderReference.id;
      });
    } catch (error) {
      if (error instanceof HttpsError && error.code === "already-exists") {
        response.status(200).json({ received: true, orderCreated: false });
        return;
      }

      logger.error("Paystack webhook processing failed", { reference, providerEventId, error });
      response.status(500).json({ error: "processing_failed" });
      return;
    }

    response.status(200).json({ received: true, orderCreated: orderId !== null, orderId });
  }
);
