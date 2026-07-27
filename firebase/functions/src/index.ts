import {
  FULFILLMENT_STATUSES,
  isAppRole,
  isUserStatus,
  type AppRole,
  type FulfillmentStatus,
  type UserStatus,
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
  assertUserStatusTransition,
} from "@spaceman/app-functions";
import {
  archiveOrRedactAccountInputSchema,
  bootstrapCustomerProfileInputSchema,
  createStaffUserInputSchema,
  driverAssignmentInputSchema,
  driverLocationInputSchema,
  fulfillmentTransitionInputSchema,
  refundRequestInputSchema,
  testFixtureMutationInputSchema,
  updateUserScopeInputSchema,
  updateUserStatusInputSchema,
} from "@spaceman/app-validation";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

export {
  cancelCatalogImport,
  cleanupCatalogMedia,
  commitCatalogImport,
  retireCatalogItem,
  reviewStoreSubmission,
  searchStorePlaces,
  setItemAvailability,
  stageCsvCatalogImport,
  stageGoogleStoreImport,
  submitMerchantStore,
  updateMerchantStore,
  upsertItem,
  upsertStore,
} from "./marketplace.js";
export {
  createCheckoutSession,
  handlePaystackWebhook,
  initializePaystackPayment,
  paystackPaymentReturn,
  publishDeliveryFeeRule,
  searchDeliveryAddresses,
  updateCheckoutSettings,
  upsertDeliveryZone,
  verifyPaystackPayment,
} from "./phase4.js";

if (getApps().length === 0) {
  initializeApp();
}

const database = getFirestore();
const authentication = getAuth();
const functionRegion = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";

type Actor = {
  uid: string;
  role: AppRole;
  storeIds: string[];
};

type SignedInActor = {
  uid: string;
  email: string;
};

type SafeParseResult<TOutput> =
  | { success: true; data: TOutput }
  | { success: false; error: { flatten(): unknown } };

interface SafeParseSchema<TOutput> {
  safeParse(value: unknown): SafeParseResult<TOutput>;
}

function parseCallableInput<TOutput>(
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

async function requireActiveActor(request: {
  auth?: { uid: string; token: Record<string, unknown> } | null;
}): Promise<Actor> {
  if (request.auth === null || request.auth === undefined) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const profileSnapshot = await database
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (!profileSnapshot.exists) {
    throw new HttpsError(
      "permission-denied",
      "An active platform profile is required.",
    );
  }
  const profile = asRecord(profileSnapshot.data());
  const role = asAppRole(profile.role);
  const status = asUserStatus(profile.status);
  if (status !== "active") {
    throw new HttpsError(
      "permission-denied",
      "An active platform role is required.",
    );
  }
  if (role === "customer" && request.auth.token.email_verified !== true) {
    throw new HttpsError(
      "permission-denied",
      "Customer email verification is required.",
    );
  }

  const scope = asRecord(profile.scope);
  const storeIds = Array.isArray(scope.storeIds)
    ? scope.storeIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return { uid: request.auth.uid, role, storeIds };
}

function requireSignedInActor(request: {
  auth?: { uid: string; token: Record<string, unknown> } | null;
}): SignedInActor {
  if (request.auth === null || request.auth === undefined) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  const email = request.auth.token.email;
  if (typeof email !== "string" || email.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "The authenticated account has no email address.",
    );
  }
  return { uid: request.auth.uid, email: email.trim().toLowerCase() };
}

function requireTrustedCommand(
  actor: Actor,
  command: Parameters<typeof assertTrustedCommandAccess>[0],
): void {
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
  if (
    typeof value !== "string" ||
    !FULFILLMENT_STATUSES.includes(value as FulfillmentStatus)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The order has an invalid fulfillment state.",
    );
  }
  return value as FulfillmentStatus;
}

function asAppRole(value: unknown): AppRole {
  if (typeof value !== "string" || !isAppRole(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The user profile has an invalid role.",
    );
  }
  return value;
}

function asUserStatus(value: unknown): UserStatus {
  if (typeof value !== "string" || !isUserStatus(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The user profile has an invalid status.",
    );
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The stored order has an invalid structure.",
    );
  }
  return value as Record<string, unknown>;
}

function ensureMerchantScope(actor: Actor, storeId: unknown): void {
  if (typeof storeId !== "string") {
    throw new HttpsError(
      "failed-precondition",
      "The stored record has no valid store scope.",
    );
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
  scope: { storeIds?: unknown; deliveryZoneIds?: unknown; regionIds?: unknown },
): Record<string, unknown> {
  const strings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : [];
  return {
    role,
    status,
    storeIds: strings(scope.storeIds),
    deliveryZoneIds: strings(scope.deliveryZoneIds),
    regionIds: strings(scope.regionIds),
  };
}

function ensureDevelopmentEnvironment(): void {
  if (process.env.SPACEMAN_ENVIRONMENT !== "development") {
    throw new HttpsError(
      "failed-precondition",
      "Test fixtures are available only in the development project.",
    );
  }
}

export const healthcheck = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    return {
      actorRole: actor.role,
      environment: process.env.SPACEMAN_ENVIRONMENT ?? "unconfigured",
      status: "ready_for_configuration",
    };
  },
);

export const registerCustomerProfile = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = requireSignedInActor(request);
    const input = parseCallableInput(
      bootstrapCustomerProfileInputSchema,
      request.data,
    );
    const profileReference = database.collection("users").doc(actor.uid);
    const auditReference = database.collection("auditLogs").doc();

    await database.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(profileReference);
      if (existingSnapshot.exists) {
        const existing = asRecord(existingSnapshot.data());
        if (existing.role !== "customer" || existing.email !== actor.email) {
          throw new HttpsError(
            "already-exists",
            "This account already has a different platform profile.",
          );
        }
        return;
      }

      const profile = {
        id: actor.uid,
        email: actor.email,
        displayName: input.displayName,
        role: "customer",
        status: "active",
        scope: { storeIds: [], deliveryZoneIds: [], regionIds: [] },
        ...(input.phoneE164 === undefined
          ? {}
          : { phoneE164: input.phoneE164 }),
        schemaVersion: 1,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      };
      transaction.create(profileReference, profile);
      transaction.create(auditReference, {
        id: auditReference.id,
        actorId: actor.uid,
        actorRole: "customer",
        action: "customer_registered",
        targetType: "user",
        targetId: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    });

    const account = await authentication.getUser(actor.uid);
    await authentication.setCustomUserClaims(actor.uid, {
      ...(account.customClaims ?? {}),
      ...claimsForProfile("customer", "active", {
        storeIds: [],
        deliveryZoneIds: [],
        regionIds: [],
      }),
    });
    return { id: actor.uid, acceptedAt: new Date().toISOString() };
  },
);

export const syncMyClaims = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = requireSignedInActor(request);
    const profileSnapshot = await database
      .collection("users")
      .doc(actor.uid)
      .get();
    if (!profileSnapshot.exists) {
      throw new HttpsError("not-found", "The user profile does not exist.");
    }
    const profile = asRecord(profileSnapshot.data());
    if (profile.email !== actor.email) {
      throw new HttpsError(
        "failed-precondition",
        "The account email does not match its platform profile.",
      );
    }
    const role = asAppRole(profile.role);
    const status = asUserStatus(profile.status);
    const scope = asRecord(profile.scope);
    const account = await authentication.getUser(actor.uid);
    await authentication.setCustomUserClaims(actor.uid, {
      ...(account.customClaims ?? {}),
      ...claimsForProfile(role, status, scope),
    });
    return { id: actor.uid, acceptedAt: new Date().toISOString() };
  },
);

export const createStaffUser = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "createStaffUser");
    const input = parseCallableInput(createStaffUserInputSchema, request.data);
    const account = await authentication.createUser({
      email: input.email,
      displayName: input.displayName,
      disabled: false,
    });
    const profileReference = database.collection("users").doc(account.uid);

    try {
      await authentication.setCustomUserClaims(
        account.uid,
        claimsForProfile(input.role, "invited", input.scope),
      );
      const auditReference = database.collection("auditLogs").doc();
      const batch = database.batch();
      batch.create(profileReference, {
        id: account.uid,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        status: "invited",
        scope: input.scope,
        ...(input.phoneE164 === undefined
          ? {}
          : { phoneE164: input.phoneE164 }),
        schemaVersion: 1,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
      batch.create(auditReference, {
        id: auditReference.id,
        actorId: actor.uid,
        actorRole: actor.role,
        action: "staff_user_invited",
        targetType: "user",
        targetId: account.uid,
        detail: { role: input.role },
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
      await batch.commit();
    } catch {
      await authentication.deleteUser(account.uid).catch(() => undefined);
      logger.error("Staff account provisioning failed", {
        actorId: actor.uid,
        staffUserId: account.uid,
      });
      throw new HttpsError(
        "internal",
        "The staff account could not be provisioned.",
      );
    }

    return { id: account.uid, acceptedAt: new Date().toISOString() };
  },
);

export const updateUserStatus = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "updateUserStatus");
    const input = parseCallableInput(updateUserStatusInputSchema, request.data);
    const profileReference = database.collection("users").doc(input.userId);
    const profileSnapshot = await profileReference.get();
    if (!profileSnapshot.exists) {
      throw new HttpsError("not-found", "The user profile does not exist.");
    }

    const profile = asRecord(profileSnapshot.data());
    const targetRole = asAppRole(profile.role);
    const currentStatus = asUserStatus(profile.status);
    assertUserManagement(actor, targetRole);
    try {
      assertUserStatusTransition(currentStatus, input.status);
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpsError("failed-precondition", error.userMessage);
      }
      throw error;
    }
    const scope = asRecord(profile.scope);
    const account = await authentication.getUser(input.userId);
    const disabled =
      input.status === "suspended" || input.status === "archived";

    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.update(profileReference, {
      status: input.status,
      ...(input.status === "archived"
        ? { archivedAt: FieldValue.serverTimestamp() }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    batch.create(auditReference, {
      id: auditReference.id,
      actorId: actor.uid,
      actorRole: actor.role,
      action: "user_status_updated",
      targetType: "user",
      targetId: input.userId,
      detail: { status: input.status },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    await batch.commit();
    await Promise.all([
      authentication.updateUser(input.userId, { disabled }),
      authentication.setCustomUserClaims(input.userId, {
        ...(account.customClaims ?? {}),
        ...claimsForProfile(targetRole, input.status, scope),
      }),
    ]);

    return { id: input.userId, acceptedAt: new Date().toISOString() };
  },
);

export const updateUserScope = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
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
    const status =
      typeof profile.status === "string" ? profile.status : "pending_profile";
    const account = await authentication.getUser(input.userId);

    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.update(profileReference, {
      scope: input.scope,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    batch.create(auditReference, {
      id: auditReference.id,
      actorId: actor.uid,
      actorRole: actor.role,
      action: "user_scope_updated",
      targetType: "user",
      targetId: input.userId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    await batch.commit();
    await Promise.all([
      authentication.setCustomUserClaims(input.userId, {
        ...(account.customClaims ?? {}),
        ...claimsForProfile(targetRole, status, input.scope),
      }),
    ]);

    return { id: input.userId, acceptedAt: new Date().toISOString() };
  },
);

export const transitionMerchantFulfillment = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "transitionMerchantFulfillment");
    const input = parseCallableInput(
      fulfillmentTransitionInputSchema,
      request.data,
    );
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
        throw new HttpsError(
          "aborted",
          "The order changed before the transition could be applied.",
        );
      }

      try {
        assertFulfillmentTransition(
          actor.role,
          currentStatus,
          input.nextStatus,
        );
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
        updatedBy: actor.uid,
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
        updatedBy: actor.uid,
      });
    });

    return { id: input.orderId, acceptedAt: new Date().toISOString() };
  },
);

export const assignDriver = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "assignDriver");
    const input = parseCallableInput(driverAssignmentInputSchema, request.data);
    const orderReference = database.collection("orders").doc(input.orderId);
    const assignmentReference = database
      .collection("driverAssignments")
      .doc(input.orderId);
    const driverReference = database.collection("users").doc(input.driverId);

    await database.runTransaction(async (transaction) => {
      const [orderSnapshot, assignmentSnapshot, driverSnapshot] =
        await Promise.all([
          transaction.get(orderReference),
          transaction.get(assignmentReference),
          transaction.get(driverReference),
        ]);
      if (!orderSnapshot.exists) {
        throw new HttpsError("not-found", "The order does not exist.");
      }
      if (!driverSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "The selected driver profile does not exist.",
        );
      }

      const order = asRecord(orderSnapshot.data());
      const assignment = assignmentSnapshot.exists
        ? asRecord(assignmentSnapshot.data())
        : {};
      const driver = asRecord(driverSnapshot.data());
      if (driver.role !== "driver" || driver.status !== "active") {
        throw new HttpsError(
          "failed-precondition",
          "The selected user is not an active driver.",
        );
      }
      const currentVersion =
        typeof assignment.version === "number" ? assignment.version : 0;
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
        updatedBy: actor.uid,
      });
      transaction.update(orderReference, {
        assignment: {
          status: "assigned",
          version: nextVersion,
          driverId: input.driverId,
          assignedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    });

    return { id: input.orderId, acceptedAt: new Date().toISOString() };
  },
);

export const updateDriverLocation = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "updateDriverLocation");
    const input = parseCallableInput(driverLocationInputSchema, request.data);
    const orderReference = database.collection("orders").doc(input.orderId);
    const assignmentReference = database
      .collection("driverAssignments")
      .doc(input.orderId);

    await database.runTransaction(async (transaction) => {
      const [orderSnapshot, assignmentSnapshot] = await Promise.all([
        transaction.get(orderReference),
        transaction.get(assignmentReference),
      ]);
      if (!orderSnapshot.exists || !assignmentSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "An active delivery assignment is required.",
        );
      }

      const order = asRecord(orderSnapshot.data());
      const assignment = asRecord(assignmentSnapshot.data());
      const fulfillment = asRecord(order.fulfillment);
      try {
        assertForegroundLocationEligibility(
          actor.uid,
          assignment.driverId,
          fulfillment.status,
        );
      } catch (error) {
        if (error instanceof AppError) {
          throw new HttpsError("permission-denied", error.userMessage);
        }
        throw error;
      }

      const locationReference = database
        .collection("driverLocations")
        .doc(input.orderId);
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
        updatedBy: actor.uid,
      });
    });

    return { id: input.orderId, acceptedAt: new Date().toISOString() };
  },
);

export const requestRefund = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
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
      const totalAmount =
        typeof total.amountMinor === "number" ? total.amountMinor : null;
      if (totalAmount === null || typeof total.currency !== "string") {
        throw new HttpsError(
          "failed-precondition",
          "The order has an invalid total.",
        );
      }
      const requestedAmount = input.amountMinor ?? totalAmount;
      try {
        assertRefundReviewAllowed({
          paymentStatus: payment.status,
          refundStatus: payment.refundStatus,
          totalAmountMinor: totalAmount,
          requestedAmountMinor: requestedAmount,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw new HttpsError(
            error.code === "invalid_input"
              ? "invalid-argument"
              : "failed-precondition",
            error.userMessage,
          );
        }
        throw error;
      }

      const currentNeedsAction =
        order.needsAction === undefined ? {} : asRecord(order.needsAction);
      const currentReasons = Array.isArray(currentNeedsAction.reasons)
        ? currentNeedsAction.reasons.filter(
            (reason): reason is string => typeof reason === "string",
          )
        : [];
      const reasons = [
        ...new Set([
          ...currentReasons.filter((reason) => reason !== "none"),
          "refund_review",
        ]),
      ];
      const activityReference = database.collection("activities").doc();
      const auditReference = database.collection("auditLogs").doc();

      transaction.update(orderReference, {
        "payment.refundStatus": "requested",
        "payment.refundRequestedAmount": {
          amountMinor: requestedAmount,
          currency: total.currency,
        },
        needsAction: {
          reasons,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
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
        updatedBy: actor.uid,
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
        updatedBy: actor.uid,
      });
    });

    return { id: input.orderId, acceptedAt: new Date().toISOString() };
  },
);

export const archiveOrRedactAccount = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "archiveOrRedactAccount");
    const input = parseCallableInput(
      archiveOrRedactAccountInputSchema,
      request.data,
    );
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
            phoneE164: FieldValue.delete(),
          }
        : {}),
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    batch.set(activityReference, {
      id: activityReference.id,
      actorId: actor.uid,
      actorRole: actor.role,
      activityType:
        input.mode === "redact" ? "account_redacted" : "account_archived",
      resourceType: "user",
      resourceId: input.userId,
      summary:
        input.mode === "redact"
          ? "Account profile redacted."
          : "Account archived.",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
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
      updatedBy: actor.uid,
    });
    await batch.commit();

    const redactedEmail = `redacted-${input.userId}@redacted.invalid`;
    await Promise.all([
      authentication.updateUser(input.userId, {
        disabled: true,
        ...(input.mode === "redact"
          ? { displayName: "Redacted user", email: redactedEmail }
          : {}),
      }),
      authentication.setCustomUserClaims(input.userId, {
        ...(account.customClaims ?? {}),
        ...claimsForProfile(targetRole, "archived", archivedScope),
      }),
    ]);

    return { id: input.userId, acceptedAt: new Date().toISOString() };
  },
);

export const seedTestFixtures = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "seedTestFixtures");
    ensureDevelopmentEnvironment();
    const input = parseCallableInput(
      testFixtureMutationInputSchema,
      request.data,
    );
    const batch = database.batch();

    for (let index = 0; index < input.count; index += 1) {
      const storeReference = database
        .collection("stores")
        .doc(`test-${input.testRunId}-${index}`);
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
        updatedBy: actor.uid,
      });
    }

    await batch.commit();
    logger.info("Seeded scoped development fixtures", {
      testRunId: input.testRunId,
      count: input.count,
    });
    return { id: input.testRunId, acceptedAt: new Date().toISOString() };
  },
);

export const cleanupTestFixtures = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActiveActor(request);
    requireTrustedCommand(actor, "cleanupTestFixtures");
    ensureDevelopmentEnvironment();
    const input = parseCallableInput(
      testFixtureMutationInputSchema,
      request.data,
    );
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
      "notificationOutbox",
      "activities",
      "auditLogs",
      "feeRules",
      "deliveryZones",
      "importBatches",
      "settlements",
    ];
    let deleted = 0;

    for (const collectionName of collections) {
      for (let batchNumber = 0; batchNumber < 100; batchNumber += 1) {
        const snapshots = await database
          .collection(collectionName)
          .where("testRunId", "==", input.testRunId)
          .limit(250)
          .get();
        if (snapshots.empty) break;

        const batch = database.batch();
        snapshots.docs.forEach((snapshot) => batch.delete(snapshot.ref));
        await batch.commit();
        deleted += snapshots.size;
        if (snapshots.size < 250) break;
      }
    }

    const residue = (
      await Promise.all(
        collections.map((collectionName) =>
          database
            .collection(collectionName)
            .where("testRunId", "==", input.testRunId)
            .limit(1)
            .get(),
        ),
      )
    ).filter((snapshot) => !snapshot.empty);
    if (residue.length > 0) {
      throw new HttpsError(
        "internal",
        "Exact fixture cleanup left tagged development records.",
      );
    }

    logger.info("Cleaned scoped development fixtures", {
      testRunId: input.testRunId,
      deleted,
      remaining: 0,
    });
    return {
      id: input.testRunId,
      acceptedAt: new Date().toISOString(),
      deleted,
      remaining: 0,
    };
  },
);
