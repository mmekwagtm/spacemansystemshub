import { createHash } from "node:crypto";

import {
  isAppRole,
  isUserStatus,
  type AppRole,
  type UserStatus,
} from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import {
  assertCatalogMediaScope,
  assertStoreScope,
  assertTrustedCommandAccess,
  decideMerchantStoreSubmissionAction,
  decideCatalogImportCommit,
  stableCatalogImportItemId,
} from "@spaceman/app-functions";
import {
  cancelCatalogImportInputSchema,
  cleanupCatalogMediaInputSchema,
  commitCatalogImportInputSchema,
  normalizeSearchText,
  retireCatalogItemInputSchema,
  reviewStoreSubmissionInputSchema,
  setItemAvailabilityInputSchema,
  stageCsvCatalogImportInputSchema,
  stageGoogleStoreImportInputSchema,
  storePlaceSearchInputSchema,
  submitMerchantStoreInputSchema,
  updateMerchantStoreInputSchema,
  upsertItemInputSchema,
  upsertStoreInputSchema,
} from "@spaceman/app-validation";
import { parse } from "csv-parse/sync";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
} from "firebase-admin/firestore";
import { getDownloadURL, getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (getApps().length === 0) initializeApp();

const database = getFirestore();
const authentication = getAuth();
const storage = getStorage();
const functionRegion = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const googleMapsServerApiKey = defineSecret("GOOGLE_MAPS_SERVER_API_KEY");

type Actor = {
  uid: string;
  role: AppRole;
  status: UserStatus;
  storeIds: string[];
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

type ExternalCatalogRow = {
  name: string;
  description?: string;
  priceMinor: number;
  categoryLabel: string;
  available: boolean;
  imageAlt: string;
  sourceId?: string;
};

type CatalogMedia = {
  sourcePath: string;
  thumbnailPath: string;
  altText: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sourceUrl?: string;
  thumbnailUrl?: string;
  attribution?: string;
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

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The stored marketplace record is invalid.",
    );
  }
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

async function requireActor(
  request: CallableRequest,
  options: { allowPendingMerchant?: boolean } = {},
): Promise<Actor> {
  if (request.auth === null || request.auth === undefined) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  const snapshot = await database
    .collection("users")
    .doc(request.auth.uid)
    .get();
  if (!snapshot.exists)
    throw new HttpsError(
      "permission-denied",
      "A platform profile is required.",
    );
  const profile = asRecord(snapshot.data());
  if (typeof profile.role !== "string" || !isAppRole(profile.role)) {
    throw new HttpsError(
      "failed-precondition",
      "The marketplace actor role is invalid.",
    );
  }
  if (typeof profile.status !== "string" || !isUserStatus(profile.status)) {
    throw new HttpsError(
      "failed-precondition",
      "The marketplace actor status is invalid.",
    );
  }
  const pendingMerchant =
    options.allowPendingMerchant === true &&
    profile.role === "merchant" &&
    ["pending_profile", "pending_approval"].includes(profile.status);
  if (profile.status !== "active" && !pendingMerchant) {
    throw new HttpsError(
      "permission-denied",
      "An active marketplace role is required.",
    );
  }
  const scope = asRecord(profile.scope);
  return {
    uid: request.auth.uid,
    role: profile.role,
    status: profile.status,
    storeIds: stringArray(scope.storeIds),
  };
}

function requireCommand(
  actor: Actor,
  command: Parameters<typeof assertTrustedCommandAccess>[0],
): void {
  try {
    assertTrustedCommandAccess(command, actor.role);
  } catch (error) {
    if (error instanceof AppError)
      throw new HttpsError("permission-denied", error.userMessage);
    throw error;
  }
}

function requireStoreScope(actor: Actor, storeId: string): void {
  try {
    assertStoreScope(actor.role, actor.storeIds, storeId);
  } catch (error) {
    if (error instanceof AppError)
      throw new HttpsError("permission-denied", error.userMessage);
    throw error;
  }
}

function merchantSubmissionAction(
  actor: Actor,
  exists: boolean,
  store: Record<string, unknown>,
) {
  try {
    return decideMerchantStoreSubmissionAction({
      exists,
      actorId: actor.uid,
      merchantId: store.merchantId,
      status: store.status,
      approvalState: store.approvalState,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw new HttpsError(
        error.code === "authorization_denied"
          ? "permission-denied"
          : "failed-precondition",
        error.userMessage,
      );
    }
    throw error;
  }
}

function metadata(actor: Actor, existing: boolean): Record<string, unknown> {
  return {
    ...(existing
      ? {}
      : { createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid }),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
}

function auditRecord(
  reference: DocumentReference,
  actor: Actor,
  action: string,
  targetType: string,
  targetId: string,
  detail?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: reference.id,
    actorId: actor.uid,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    ...(detail === undefined ? {} : { detail }),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
}

function assertMediaPaths(media: unknown, storeId: string): void {
  if (media === undefined) return;
  const value = asRecord(media);
  if (
    typeof value.sourcePath !== "string" ||
    typeof value.thumbnailPath !== "string"
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Catalog media paths are invalid.",
    );
  }
  try {
    assertCatalogMediaScope(storeId, {
      sourcePath: value.sourcePath,
      thumbnailPath: value.thumbnailPath,
    });
  } catch (error) {
    if (error instanceof AppError)
      throw new HttpsError("permission-denied", error.userMessage);
    throw error;
  }
}

type PreparedMedia = {
  media?: CatalogMedia;
  createdPaths?: [string, string];
  replacedPaths?: [string, string];
  stagedPaths?: [string, string];
};

type CatalogMediaInput = Omit<
  CatalogMedia,
  "sourceUrl" | "thumbnailUrl" | "attribution"
> & {
  sourceUrl?: string | undefined;
  thumbnailUrl?: string | undefined;
  attribution?: string | undefined;
};

function canonicalMedia(media: CatalogMediaInput): CatalogMedia {
  return {
    sourcePath: media.sourcePath,
    thumbnailPath: media.thumbnailPath,
    altText: media.altText,
    contentType: media.contentType,
    sizeBytes: media.sizeBytes,
    ...(media.sourceUrl === undefined ? {} : { sourceUrl: media.sourceUrl }),
    ...(media.thumbnailUrl === undefined
      ? {}
      : { thumbnailUrl: media.thumbnailUrl }),
    ...(media.attribution === undefined
      ? {}
      : { attribution: media.attribution }),
  };
}

function publishedMediaPaths(
  value: unknown,
  storeId: string,
): [string, string] | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const media = value as Record<string, unknown>;
  const prefix = `catalog/${storeId}/published/`;
  return typeof media.sourcePath === "string" &&
    typeof media.thumbnailPath === "string" &&
    media.sourcePath.startsWith(prefix) &&
    media.thumbnailPath.startsWith(prefix)
    ? [media.sourcePath, media.thumbnailPath]
    : undefined;
}

async function preparePublishedMedia(
  media: CatalogMediaInput | undefined,
  actor: Actor,
  storeId: string,
  targetType: "store-card" | "store-hero" | "item",
  targetId: string,
  previousMedia?: unknown,
): Promise<PreparedMedia> {
  if (media === undefined) return {};
  assertMediaPaths(media, storeId);
  const publishedPrefix = `catalog/${storeId}/published/`;
  if (
    media.sourcePath.startsWith(publishedPrefix) &&
    media.thumbnailPath.startsWith(publishedPrefix)
  ) {
    return { media: canonicalMedia(media) };
  }
  const stagingPrefix = `catalog/${storeId}/staging/${actor.uid}/`;
  if (
    !media.sourcePath.startsWith(stagingPrefix) ||
    !media.thumbnailPath.startsWith(stagingPrefix)
  ) {
    throw new HttpsError(
      "permission-denied",
      "Catalog media must come from the current actor's staging path.",
    );
  }
  const sourceParts = media.sourcePath.split("/");
  const thumbnailParts = media.thumbnailPath.split("/");
  const assetId = sourceParts.at(-2);
  if (!assetId || thumbnailParts.at(-2) !== assetId) {
    throw new HttpsError(
      "invalid-argument",
      "Catalog source and thumbnail must belong to one staged asset.",
    );
  }
  const bucket = storage.bucket();
  const sourceFile = bucket.file(media.sourcePath);
  const thumbnailFile = bucket.file(media.thumbnailPath);
  const [[sourceExists], [thumbnailExists]] = await Promise.all([
    sourceFile.exists(),
    thumbnailFile.exists(),
  ]);
  if (!sourceExists || !thumbnailExists) {
    throw new HttpsError(
      "failed-precondition",
      "The staged catalog image is incomplete.",
    );
  }
  const [[sourceMetadata], [thumbnailMetadata]] = await Promise.all([
    sourceFile.getMetadata(),
    thumbnailFile.getMetadata(),
  ]);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const sourceType = sourceMetadata.contentType ?? "";
  const thumbnailType = thumbnailMetadata.contentType ?? "";
  const sourceSize = Number(sourceMetadata.size ?? 0);
  const thumbnailSize = Number(thumbnailMetadata.size ?? 0);
  if (
    !allowedTypes.includes(sourceType) ||
    sourceType !== thumbnailType ||
    sourceSize <= 0 ||
    sourceSize > 5_000_000 ||
    thumbnailSize <= 0 ||
    thumbnailSize > 750_000
  ) {
    throw new HttpsError(
      "invalid-argument",
      "The staged catalog image metadata is invalid.",
    );
  }
  const extension =
    sourceType === "image/jpeg"
      ? "jpg"
      : sourceType === "image/png"
        ? "png"
        : "webp";
  const destinationPrefix = `catalog/${storeId}/published/${targetType}/${targetId}/${assetId}`;
  const sourcePath = `${destinationPrefix}/source.${extension}`;
  const thumbnailPath = `${destinationPrefix}/thumbnail.${extension}`;
  const publishedSource = bucket.file(sourcePath);
  const publishedThumbnail = bucket.file(thumbnailPath);
  await Promise.all([
    sourceFile.copy(publishedSource),
    thumbnailFile.copy(publishedThumbnail),
  ]);
  const [sourceUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(publishedSource),
    getDownloadURL(publishedThumbnail),
  ]);
  const replacedPaths = publishedMediaPaths(previousMedia, storeId);
  return {
    media: {
      sourcePath,
      thumbnailPath,
      sourceUrl,
      thumbnailUrl,
      altText: media.altText,
      contentType: sourceType as CatalogMedia["contentType"],
      sizeBytes: sourceSize,
      ...(media.attribution === undefined
        ? {}
        : { attribution: media.attribution }),
    },
    createdPaths: [sourcePath, thumbnailPath],
    ...(replacedPaths === undefined ? {} : { replacedPaths }),
    stagedPaths: [media.sourcePath, media.thumbnailPath],
  };
}

async function deleteExactMedia(paths: [string, string] | undefined) {
  if (!paths) return;
  const bucket = storage.bucket();
  await Promise.all(
    paths.map((path) => bucket.file(path).delete({ ignoreNotFound: true })),
  );
}

async function writeWithPublishedMedia(
  prepared: PreparedMedia[],
  write: () => Promise<void>,
): Promise<void> {
  try {
    await write();
  } catch (error) {
    await Promise.all(
      prepared.map((entry) => deleteExactMedia(entry.createdPaths)),
    );
    throw error;
  }
  await Promise.all(
    prepared.map(async (entry) => {
      try {
        await Promise.all([
          deleteExactMedia(entry.stagedPaths),
          deleteExactMedia(entry.replacedPaths),
        ]);
      } catch (error) {
        logger.warn("Committed catalog media staging cleanup failed", {
          error,
          stagedPaths: entry.stagedPaths,
        });
      }
    }),
  );
}

function itemDocument(
  actor: Actor,
  storeId: string,
  input: ReturnType<typeof upsertItemInputSchema.parse>,
  existing: boolean,
): Record<string, unknown> {
  const source = actor.role === "merchant" ? "merchant" : input.source;
  return {
    storeId,
    name: input.name,
    searchName: normalizeSearchText(input.name),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    status: input.status,
    available: input.available,
    price: input.price,
    categoryLabel: input.categoryLabel,
    sortOrder: input.sortOrder,
    source,
    ...(input.sourceId === undefined ? {} : { sourceId: input.sourceId }),
    ...(input.importBatchId === undefined
      ? {}
      : { importBatchId: input.importBatchId }),
    imageAlt: input.imageAlt,
    ...(input.media === undefined ? {} : { media: input.media }),
    ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
    ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
    ...metadata(actor, existing),
  };
}

export const upsertStore = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "upsertStore");
    const input = parseInput(upsertStoreInputSchema, request.data);
    const storeReference =
      input.storeId === undefined
        ? database.collection("stores").doc()
        : database.collection("stores").doc(input.storeId);
    const existingSnapshot = await storeReference.get();
    const existingStore = existingSnapshot.exists
      ? asRecord(existingSnapshot.data())
      : {};
    const cardMedia = await preparePublishedMedia(
      input.cardMedia,
      actor,
      storeReference.id,
      "store-card",
      storeReference.id,
      existingStore.cardMedia,
    );
    const heroMedia = await preparePublishedMedia(
      input.heroMedia,
      actor,
      storeReference.id,
      "store-hero",
      storeReference.id,
      existingStore.heroMedia,
    );
    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.set(
      storeReference,
      {
        id: storeReference.id,
        merchantId: input.merchantId,
        name: input.name,
        searchName: normalizeSearchText(input.name),
        category: input.category,
        description: input.description,
        status: input.status,
        approvalState: input.status === "active" ? "approved" : "pending",
        source: "manual",
        deliveryZoneIds: input.deliveryZoneIds,
        address: input.address,
        openingHours: input.openingHours,
        openForOrders: input.status === "active" && input.openForOrders,
        minimumOrder: input.minimumOrder,
        ...(cardMedia.media === undefined
          ? {}
          : { cardMedia: cardMedia.media }),
        ...(heroMedia.media === undefined
          ? {}
          : { heroMedia: heroMedia.media }),
        ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
        ...metadata(actor, existingSnapshot.exists),
      },
      { merge: true },
    );
    batch.create(
      auditReference,
      auditRecord(
        auditReference,
        actor,
        existingSnapshot.exists ? "store_updated" : "store_created",
        "store",
        storeReference.id,
      ),
    );
    await writeWithPublishedMedia([cardMedia, heroMedia], async () => {
      await batch.commit();
    });
    return { id: storeReference.id, acceptedAt: new Date().toISOString() };
  },
);

export const submitMerchantStore = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request, { allowPendingMerchant: true });
    requireCommand(actor, "submitMerchantStore");
    const input = parseInput(submitMerchantStoreInputSchema, request.data);
    const storeReference =
      input.storeId === undefined
        ? database.collection("stores").doc()
        : database.collection("stores").doc(input.storeId);
    const existingSnapshot = await storeReference.get();
    const existingStore = existingSnapshot.exists
      ? asRecord(existingSnapshot.data())
      : {};
    merchantSubmissionAction(actor, existingSnapshot.exists, existingStore);
    const cardMedia = await preparePublishedMedia(
      input.cardMedia,
      actor,
      storeReference.id,
      "store-card",
      storeReference.id,
      existingStore.cardMedia,
    );
    const heroMedia = await preparePublishedMedia(
      input.heroMedia,
      actor,
      storeReference.id,
      "store-hero",
      storeReference.id,
      existingStore.heroMedia,
    );
    const auditReference = database.collection("auditLogs").doc();
    await writeWithPublishedMedia([cardMedia, heroMedia], async () => {
      await database.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(storeReference);
        const currentStore = currentSnapshot.exists
          ? asRecord(currentSnapshot.data())
          : {};
        const action = merchantSubmissionAction(
          actor,
          currentSnapshot.exists,
          currentStore,
        );
        transaction.set(
          storeReference,
          {
            id: storeReference.id,
            merchantId: actor.uid,
            name: input.name,
            searchName: normalizeSearchText(input.name),
            category: input.category,
            description: input.description,
            status: "draft",
            approvalState: "pending",
            source: "merchant",
            deliveryZoneIds: [],
            address: input.address,
            openingHours: input.openingHours,
            openForOrders: false,
            minimumOrder: input.minimumOrder,
            ...(cardMedia.media === undefined
              ? {}
              : { cardMedia: cardMedia.media }),
            ...(heroMedia.media === undefined
              ? {}
              : { heroMedia: heroMedia.media }),
            ...(currentSnapshot.exists
              ? {
                  rejectionReason: FieldValue.delete(),
                  reviewedAt: FieldValue.delete(),
                  reviewedBy: FieldValue.delete(),
                }
              : {}),
            ...metadata(actor, currentSnapshot.exists),
          },
          { merge: true },
        );
        transaction.create(
          auditReference,
          auditRecord(
            auditReference,
            actor,
            action === "create"
              ? "merchant_store_submitted"
              : action === "resubmit_rejected"
                ? "merchant_store_resubmitted"
                : "merchant_store_submission_updated",
            "store",
            storeReference.id,
          ),
        );
      });
    });
    return { id: storeReference.id, acceptedAt: new Date().toISOString() };
  },
);

export const reviewStoreSubmission = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "reviewStoreSubmission");
    const input = parseInput(reviewStoreSubmissionInputSchema, request.data);
    const storeReference = database.collection("stores").doc(input.storeId);
    let merchantId = "";
    let merchantScope: Record<string, unknown> = {};
    let merchantRole: AppRole = "merchant";
    let merchantStatus: UserStatus = "pending_approval";

    await database.runTransaction(async (transaction) => {
      const storeSnapshot = await transaction.get(storeReference);
      if (!storeSnapshot.exists)
        throw new HttpsError(
          "not-found",
          "The store submission does not exist.",
        );
      const store = asRecord(storeSnapshot.data());
      if (store.approvalState !== "pending" || store.status !== "draft") {
        throw new HttpsError(
          "failed-precondition",
          "Only a pending draft store can be reviewed.",
        );
      }
      if (typeof store.merchantId !== "string") {
        throw new HttpsError(
          "failed-precondition",
          "The store submission has no merchant owner.",
        );
      }
      merchantId = store.merchantId;
      const merchantReference = database.collection("users").doc(merchantId);
      const merchantSnapshot = await transaction.get(merchantReference);
      if (!merchantSnapshot.exists)
        throw new HttpsError(
          "failed-precondition",
          "The merchant profile is missing.",
        );
      const merchant = asRecord(merchantSnapshot.data());
      if (
        merchant.role !== "merchant" ||
        merchant.status === "suspended" ||
        merchant.status === "archived"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The merchant profile cannot own an active store.",
        );
      }
      merchantScope = asRecord(merchant.scope);
      merchantRole = merchant.role;
      merchantStatus =
        input.decision === "approve"
          ? "active"
          : (merchant.status as UserStatus);
      const auditReference = database.collection("auditLogs").doc();
      if (input.decision === "approve") {
        const deliveryZoneIds =
          input.deliveryZoneIds ?? stringArray(store.deliveryZoneIds);
        if (deliveryZoneIds.length === 0) {
          throw new HttpsError(
            "invalid-argument",
            "Approval requires at least one delivery zone.",
          );
        }
        const scope = {
          storeIds: [
            ...new Set([...stringArray(merchantScope.storeIds), input.storeId]),
          ],
          deliveryZoneIds: [
            ...new Set([
              ...stringArray(merchantScope.deliveryZoneIds),
              ...deliveryZoneIds,
            ]),
          ],
          regionIds: stringArray(merchantScope.regionIds),
        };
        merchantScope = scope;
        transaction.update(storeReference, {
          status: "active",
          approvalState: "approved",
          deliveryZoneIds,
          openForOrders: false,
          reviewedAt: FieldValue.serverTimestamp(),
          reviewedBy: actor.uid,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actor.uid,
        });
        transaction.update(merchantReference, {
          status: "active",
          scope,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actor.uid,
        });
      } else {
        transaction.update(storeReference, {
          approvalState: "rejected",
          rejectionReason:
            input.reason ?? "Submission rejected by marketplace review.",
          reviewedAt: FieldValue.serverTimestamp(),
          reviewedBy: actor.uid,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actor.uid,
        });
      }
      transaction.create(
        auditReference,
        auditRecord(
          auditReference,
          actor,
          `store_submission_${input.decision}d`,
          "store",
          input.storeId,
        ),
      );
    });

    if (input.decision === "approve") {
      const account = await authentication.getUser(merchantId);
      await authentication.setCustomUserClaims(merchantId, {
        ...(account.customClaims ?? {}),
        role: merchantRole,
        status: merchantStatus,
        storeIds: stringArray(merchantScope.storeIds),
        deliveryZoneIds: stringArray(merchantScope.deliveryZoneIds),
        regionIds: stringArray(merchantScope.regionIds),
      });
    }
    return { id: input.storeId, acceptedAt: new Date().toISOString() };
  },
);

export const updateMerchantStore = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "updateMerchantStore");
    const input = parseInput(updateMerchantStoreInputSchema, request.data);
    requireStoreScope(actor, input.storeId);
    const storeReference = database.collection("stores").doc(input.storeId);
    const snapshot = await storeReference.get();
    if (!snapshot.exists)
      throw new HttpsError("not-found", "The assigned store does not exist.");
    const store = asRecord(snapshot.data());
    if (
      store.merchantId !== actor.uid ||
      store.status !== "active" ||
      store.approvalState !== "approved"
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only the approved store owner may update this store.",
      );
    }
    const cardMedia = await preparePublishedMedia(
      input.cardMedia,
      actor,
      input.storeId,
      "store-card",
      input.storeId,
      store.cardMedia,
    );
    const heroMedia = await preparePublishedMedia(
      input.heroMedia,
      actor,
      input.storeId,
      "store-hero",
      input.storeId,
      store.heroMedia,
    );
    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.update(storeReference, {
      name: input.name,
      searchName: normalizeSearchText(input.name),
      category: input.category,
      description: input.description,
      openingHours: input.openingHours,
      openForOrders: input.openForOrders,
      minimumOrder: input.minimumOrder,
      ...(cardMedia.media === undefined ? {} : { cardMedia: cardMedia.media }),
      ...(heroMedia.media === undefined ? {} : { heroMedia: heroMedia.media }),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    batch.create(
      auditReference,
      auditRecord(
        auditReference,
        actor,
        "merchant_store_updated",
        "store",
        input.storeId,
      ),
    );
    await writeWithPublishedMedia([cardMedia, heroMedia], async () => {
      await batch.commit();
    });
    return { id: input.storeId, acceptedAt: new Date().toISOString() };
  },
);

export const upsertItem = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "upsertItem");
    const input = parseInput(upsertItemInputSchema, request.data);
    const storeSnapshot = await database
      .collection("stores")
      .doc(input.storeId)
      .get();
    if (!storeSnapshot.exists)
      throw new HttpsError("not-found", "The item store does not exist.");
    const store = asRecord(storeSnapshot.data());
    if (actor.role === "merchant") {
      requireStoreScope(actor, input.storeId);
      if (
        store.merchantId !== actor.uid ||
        store.status !== "active" ||
        store.approvalState !== "approved"
      ) {
        throw new HttpsError(
          "permission-denied",
          "Catalog management requires an approved assigned store.",
        );
      }
    }
    const itemReference =
      input.itemId === undefined
        ? database.collection("items").doc()
        : database.collection("items").doc(input.itemId);
    const existingSnapshot = await itemReference.get();
    if (
      existingSnapshot.exists &&
      asRecord(existingSnapshot.data()).storeId !== input.storeId
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Items cannot move between stores.",
      );
    }
    const media = await preparePublishedMedia(
      input.media,
      actor,
      input.storeId,
      "item",
      itemReference.id,
      existingSnapshot.exists
        ? asRecord(existingSnapshot.data()).media
        : undefined,
    );
    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.set(
      itemReference,
      {
        id: itemReference.id,
        ...itemDocument(
          actor,
          input.storeId,
          { ...input, ...(media.media ? { media: media.media } : {}) },
          existingSnapshot.exists,
        ),
      },
      { merge: true },
    );
    batch.create(
      auditReference,
      auditRecord(
        auditReference,
        actor,
        existingSnapshot.exists ? "item_updated" : "item_created",
        "item",
        itemReference.id,
      ),
    );
    await writeWithPublishedMedia([media], async () => {
      await batch.commit();
    });
    return { id: itemReference.id, acceptedAt: new Date().toISOString() };
  },
);

export const setItemAvailability = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "setItemAvailability");
    const input = parseInput(setItemAvailabilityInputSchema, request.data);
    const itemReference = database.collection("items").doc(input.itemId);
    const snapshot = await itemReference.get();
    if (!snapshot.exists)
      throw new HttpsError("not-found", "The catalog item does not exist.");
    const item = asRecord(snapshot.data());
    if (typeof item.storeId !== "string")
      throw new HttpsError("failed-precondition", "The item store is invalid.");
    if (actor.role === "merchant") requireStoreScope(actor, item.storeId);
    await itemReference.update({
      available: input.available,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    return { id: input.itemId, acceptedAt: new Date().toISOString() };
  },
);

export const retireCatalogItem = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "retireCatalogItem");
    const input = parseInput(retireCatalogItemInputSchema, request.data);
    const itemReference = database.collection("items").doc(input.itemId);
    const snapshot = await itemReference.get();
    if (!snapshot.exists)
      throw new HttpsError("not-found", "The catalog item does not exist.");
    const auditReference = database.collection("auditLogs").doc();
    const batch = database.batch();
    batch.update(itemReference, {
      status: "archived",
      available: false,
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    batch.create(
      auditReference,
      auditRecord(auditReference, actor, "item_retired", "item", input.itemId),
    );
    await batch.commit();
    return { id: input.itemId, acceptedAt: new Date().toISOString() };
  },
);

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { periods?: Array<Record<string, unknown>> };
};

function placeCandidate(place: GooglePlace) {
  if (
    typeof place.id !== "string" ||
    typeof place.displayName?.text !== "string" ||
    typeof place.formattedAddress !== "string" ||
    typeof place.location?.latitude !== "number" ||
    typeof place.location.longitude !== "number"
  )
    return null;
  return {
    placeId: place.id,
    name: place.displayName.text,
    formattedAddress: place.formattedAddress,
    category: place.primaryTypeDisplayName?.text ?? "Store",
    coordinates: {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
    },
  };
}

async function googlePlacesRequest(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    logger.error("Google Places request failed", { status: response.status });
    throw new HttpsError(
      "unavailable",
      "Google Places could not complete the request.",
    );
  }
  return response.json();
}

export const searchStorePlaces = onCall(
  { region: functionRegion, secrets: [googleMapsServerApiKey] },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "searchStorePlaces");
    const input = parseInput(storePlaceSearchInputSchema, request.data);
    const payload = await googlePlacesRequest(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleMapsServerApiKey.value(),
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          textQuery: input.query,
          pageSize: 10,
          regionCode: "ZA",
          languageCode: "en",
        }),
      },
    );
    const places = asRecord(payload).places;
    return Array.isArray(places)
      ? places
          .map((value) => placeCandidate(asRecord(value)))
          .filter((value) => value !== null)
      : [];
  },
);

export const stageGoogleStoreImport = onCall(
  { region: functionRegion, secrets: [googleMapsServerApiKey] },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "stageGoogleStoreImport");
    const input = parseInput(stageGoogleStoreImportInputSchema, request.data);
    const place = asRecord(
      await googlePlacesRequest(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(input.placeId)}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": googleMapsServerApiKey.value(),
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,location,primaryTypeDisplayName,regularOpeningHours",
          },
        },
      ),
    ) as GooglePlace;
    const candidate = placeCandidate(place);
    if (candidate === null)
      throw new HttpsError(
        "failed-precondition",
        "Google returned an incomplete place.",
      );
    const batchReference = database.collection("importBatches").doc();
    const storeId = `place-${createHash("sha256").update(input.placeId).digest("hex").slice(0, 24)}`;
    const contentHash = createHash("sha256")
      .update(`google:${input.placeId}`)
      .digest("hex");
    const duplicate = await database
      .collection("importBatches")
      .where("requestedBy", "==", actor.uid)
      .where("contentHash", "==", contentHash)
      .where("status", "in", ["ready", "applied"])
      .limit(1)
      .get();
    if (!duplicate.empty) {
      return {
        id: duplicate.docs[0]!.id,
        acceptedAt: new Date().toISOString(),
      };
    }
    const rowReference = batchReference.collection("rows").doc("store");
    const writeBatch = database.batch();
    writeBatch.create(batchReference, {
      id: batchReference.id,
      storeId,
      requestedBy: actor.uid,
      sourceType: "google_places",
      sourceReference: input.placeId,
      status: "ready",
      contentHash,
      totalRows: 1,
      acceptedRows: 1,
      rejectedRows: 0,
      committedRows: 0,
      normalizedStore: {
        id: storeId,
        merchantId: input.merchantId,
        name: candidate.name,
        searchName: normalizeSearchText(candidate.name),
        category: candidate.category,
        description: "",
        source: "google_places",
        sourceId: candidate.placeId,
        address: {
          label: candidate.name,
          formattedAddress: candidate.formattedAddress,
          coordinates: candidate.coordinates,
          placeId: candidate.placeId,
        },
        openingHours: [],
        minimumOrder: { amountMinor: 0, currency: "ZAR" },
      },
      ...metadata(actor, false),
    });
    writeBatch.create(rowReference, {
      id: rowReference.id,
      batchId: batchReference.id,
      rowNumber: 1,
      selected: true,
      valid: true,
      errors: [],
      normalized: {
        name: candidate.name,
        formattedAddress: candidate.formattedAddress,
      },
      ...metadata(actor, false),
    });
    await writeBatch.commit();
    return { id: batchReference.id, acceptedAt: new Date().toISOString() };
  },
);

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return !["false", "0", "no", "unavailable"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function normalizeExternalRow(
  value: Record<string, unknown>,
): ExternalCatalogRow {
  const name = String(value.name ?? value.title ?? "").trim();
  const rawMinorPrice = value.priceMinor ?? value.price_minor;
  const rawMajorPrice = value.price;
  const priceMinor =
    rawMinorPrice === undefined
      ? Math.round(Number(String(rawMajorPrice ?? "")) * 100)
      : Number(String(rawMinorPrice));
  if (
    name.length === 0 ||
    name.length > 160 ||
    !Number.isSafeInteger(priceMinor) ||
    priceMinor < 0
  ) {
    throw new Error(
      "Each row requires a name and a non-negative integer priceMinor.",
    );
  }
  const description = String(value.description ?? "").trim();
  const categoryLabel =
    String(value.categoryLabel ?? value.category ?? "General").trim() ||
    "General";
  const imageAlt = String(value.imageAlt ?? value.image_alt ?? name).trim();
  const sourceId = String(
    value.sourceId ?? value.external_id ?? value.id ?? "",
  ).trim();
  return {
    name,
    ...(description.length === 0
      ? {}
      : { description: description.slice(0, 2_000) }),
    priceMinor,
    categoryLabel: categoryLabel.slice(0, 120),
    available: booleanValue(value.available),
    imageAlt: imageAlt.slice(0, 240),
    ...(sourceId.length === 0 ? {} : { sourceId: sourceId.slice(0, 256) }),
  };
}

async function stageItemRows(
  actor: Actor,
  storeId: string,
  rawRows: Record<string, unknown>[],
  contentHash: string,
) {
  if (rawRows.length === 0 || rawRows.length > 400) {
    throw new HttpsError(
      "invalid-argument",
      "Catalog imports require between 1 and 400 rows.",
    );
  }
  const storeSnapshot = await database.collection("stores").doc(storeId).get();
  if (!storeSnapshot.exists)
    throw new HttpsError("not-found", "The target store does not exist.");
  const store = asRecord(storeSnapshot.data());
  if (store.status !== "active" || store.approvalState !== "approved") {
    throw new HttpsError(
      "failed-precondition",
      "Catalog imports require an approved active store.",
    );
  }
  const duplicateBatch = await database
    .collection("importBatches")
    .where("requestedBy", "==", actor.uid)
    .where("storeId", "==", storeId)
    .where("contentHash", "==", contentHash)
    .where("status", "in", ["ready", "applied"])
    .limit(1)
    .get();
  if (!duplicateBatch.empty) return duplicateBatch.docs[0]!.id;

  const existingItems = await database
    .collection("items")
    .where("storeId", "==", storeId)
    .limit(1_000)
    .get();
  const bySearchName = new Map<string, string>();
  const bySourceId = new Map<string, string>();
  existingItems.docs.forEach((snapshot) => {
    const item = asRecord(snapshot.data());
    if (typeof item.searchName === "string")
      bySearchName.set(item.searchName, snapshot.id);
    if (typeof item.sourceId === "string")
      bySourceId.set(item.sourceId, snapshot.id);
  });

  const batchReference = database.collection("importBatches").doc();
  let acceptedRows = 0;
  const rows = rawRows.map((row, index) => {
    try {
      const normalized = normalizeExternalRow(row);
      const duplicateOf =
        normalized.sourceId === undefined
          ? bySearchName.get(normalizeSearchText(normalized.name))
          : (bySourceId.get(normalized.sourceId) ??
            bySearchName.get(normalizeSearchText(normalized.name)));
      acceptedRows += 1;
      return {
        rowNumber: index + 1,
        valid: true,
        errors: [],
        normalized,
        duplicateOf,
      };
    } catch (error) {
      return {
        rowNumber: index + 1,
        valid: false,
        errors: [
          error instanceof Error ? error.message : "Invalid catalog row.",
        ],
        normalized: null,
        duplicateOf: undefined,
      };
    }
  });
  const writeBatch = database.batch();
  writeBatch.create(batchReference, {
    id: batchReference.id,
    storeId,
    requestedBy: actor.uid,
    sourceType: "catalog_csv",
    status: acceptedRows > 0 ? "ready" : "failed",
    contentHash,
    totalRows: rows.length,
    acceptedRows,
    rejectedRows: rows.length - acceptedRows,
    committedRows: 0,
    ...metadata(actor, false),
  });
  rows.forEach((row) => {
    const rowReference = batchReference
      .collection("rows")
      .doc(String(row.rowNumber).padStart(4, "0"));
    writeBatch.create(rowReference, {
      id: rowReference.id,
      batchId: batchReference.id,
      rowNumber: row.rowNumber,
      selected: row.valid,
      valid: row.valid,
      errors: row.errors,
      ...(row.duplicateOf === undefined
        ? {}
        : { duplicateOf: row.duplicateOf }),
      ...(row.normalized === null
        ? {}
        : {
            normalized: {
              storeId,
              name: row.normalized.name,
              ...(row.normalized.description === undefined
                ? {}
                : { description: row.normalized.description }),
              status: "active",
              price: {
                amountMinor: row.normalized.priceMinor,
                currency: "ZAR",
              },
              available: row.normalized.available,
              categoryLabel: row.normalized.categoryLabel,
              sortOrder: row.rowNumber,
              source: "catalog_csv",
              ...(row.normalized.sourceId === undefined
                ? {}
                : { sourceId: row.normalized.sourceId }),
              importBatchId: batchReference.id,
              imageAlt: row.normalized.imageAlt,
            },
          }),
      ...metadata(actor, false),
    });
  });
  await writeBatch.commit();
  return batchReference.id;
}

export const stageCsvCatalogImport = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "stageCsvCatalogImport");
    const input = parseInput(stageCsvCatalogImportInputSchema, request.data);
    const rows = parse(input.csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      max_record_size: 32_000,
    }) as Record<string, unknown>[];
    const contentHash = createHash("sha256").update(input.csv).digest("hex");
    const id = await stageItemRows(actor, input.storeId, rows, contentHash);
    return { id, acceptedAt: new Date().toISOString() };
  },
);

export const commitCatalogImport = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "commitCatalogImport");
    const input = parseInput(commitCatalogImportInputSchema, request.data);
    const batchReference = database
      .collection("importBatches")
      .doc(input.batchId);
    const batchSnapshot = await batchReference.get();
    if (!batchSnapshot.exists)
      throw new HttpsError("not-found", "The import batch does not exist.");
    const importBatch = asRecord(batchSnapshot.data());
    let commitAction: ReturnType<typeof decideCatalogImportCommit>;
    try {
      commitAction = decideCatalogImportCommit(String(importBatch.status));
    } catch (error) {
      if (error instanceof AppError)
        throw new HttpsError("failed-precondition", error.userMessage);
      throw error;
    }
    if (commitAction === "replay") {
      return { id: input.batchId, acceptedAt: new Date().toISOString() };
    }
    if (importBatch.requestedBy !== actor.uid && actor.role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only the staging administrator may commit this import.",
      );
    }
    const uniqueRowIds = [...new Set(input.selectedRowIds)];
    const rowSnapshots = await Promise.all(
      uniqueRowIds.map((rowId) =>
        batchReference.collection("rows").doc(rowId).get(),
      ),
    );
    if (rowSnapshots.some((snapshot) => !snapshot.exists)) {
      throw new HttpsError(
        "invalid-argument",
        "One or more selected import rows do not exist.",
      );
    }
    const rows = rowSnapshots.map((snapshot) => asRecord(snapshot.data()));
    if (rows.some((row) => row.valid !== true)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid import rows cannot be committed.",
      );
    }

    const writeBatch = database.batch();
    const auditReference = database.collection("auditLogs").doc();
    if (importBatch.sourceType === "google_places") {
      const store = asRecord(importBatch.normalizedStore);
      if (typeof store.id !== "string")
        throw new HttpsError("failed-precondition", "Store import is invalid.");
      writeBatch.set(
        database.collection("stores").doc(store.id),
        {
          ...store,
          status: "draft",
          approvalState: "pending",
          deliveryZoneIds: [],
          openForOrders: false,
          ...metadata(actor, false),
        },
        { merge: false },
      );
      writeBatch.create(
        auditReference,
        auditRecord(
          auditReference,
          actor,
          "google_store_import_committed",
          "store",
          store.id,
        ),
      );
    } else {
      if (typeof importBatch.storeId !== "string") {
        throw new HttpsError(
          "failed-precondition",
          "The import store scope is invalid.",
        );
      }
      const storeSnapshot = await database
        .collection("stores")
        .doc(importBatch.storeId)
        .get();
      if (!storeSnapshot.exists)
        throw new HttpsError("not-found", "The import store does not exist.");
      const store = asRecord(storeSnapshot.data());
      if (store.status !== "active" || store.approvalState !== "approved") {
        throw new HttpsError(
          "failed-precondition",
          "The import store is no longer active.",
        );
      }
      rows.forEach((row, index) => {
        const normalized = asRecord(row.normalized);
        const duplicateOf =
          typeof row.duplicateOf === "string" ? row.duplicateOf : undefined;
        const itemId =
          duplicateOf ??
          stableCatalogImportItemId(input.batchId, uniqueRowIds[index]!);
        writeBatch.set(
          database.collection("items").doc(itemId),
          {
            id: itemId,
            ...normalized,
            searchName: normalizeSearchText(String(normalized.name)),
            ...metadata(actor, duplicateOf !== undefined),
          },
          { merge: duplicateOf !== undefined },
        );
      });
      writeBatch.create(
        auditReference,
        auditRecord(
          auditReference,
          actor,
          "catalog_import_committed",
          "importBatch",
          input.batchId,
          { committedRows: rows.length },
        ),
      );
    }
    writeBatch.update(batchReference, {
      status: "applied",
      committedRows: rows.length,
      appliedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    await writeBatch.commit();
    return { id: input.batchId, acceptedAt: new Date().toISOString() };
  },
);

export const cancelCatalogImport = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "cancelCatalogImport");
    const input = parseInput(cancelCatalogImportInputSchema, request.data);
    const reference = database.collection("importBatches").doc(input.batchId);
    const snapshot = await reference.get();
    if (!snapshot.exists)
      throw new HttpsError("not-found", "The import batch does not exist.");
    const batch = asRecord(snapshot.data());
    if (batch.status === "applied")
      throw new HttpsError(
        "failed-precondition",
        "Applied imports cannot be cancelled.",
      );
    await reference.update({
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });
    return { id: input.batchId, acceptedAt: new Date().toISOString() };
  },
);

export const cleanupCatalogMedia = onCall(
  { region: functionRegion },
  async (request) => {
    const actor = await requireActor(request);
    requireCommand(actor, "cleanupCatalogMedia");
    const input = parseInput(cleanupCatalogMediaInputSchema, request.data);
    if (actor.role === "merchant") requireStoreScope(actor, input.storeId);
    const prefix = `catalog/${input.storeId}/staging/`;
    if (
      !input.sourcePath.startsWith(prefix) ||
      !input.thumbnailPath.startsWith(prefix)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Only exact staging media paths can be cleaned.",
      );
    }
    const bucket = storage.bucket();
    await Promise.all([
      bucket.file(input.sourcePath).delete({ ignoreNotFound: true }),
      bucket.file(input.thumbnailPath).delete({ ignoreNotFound: true }),
    ]);
    return { id: input.storeId, acceptedAt: new Date().toISOString() };
  },
);
