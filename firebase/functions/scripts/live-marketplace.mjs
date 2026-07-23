import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const apiKey = process.env.SPACEMAN_FIREBASE_WEB_API_KEY;
const region = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const bucketName =
  process.env.SPACEMAN_FIREBASE_STORAGE_BUCKET ??
  "spacemansystemsbackend.firebasestorage.app";
const googlePlaceQuery =
  process.env.SPACEMAN_GOOGLE_PLACE_QUERY ??
  "restaurants in Mabopane, South Africa";

if (
  projectId !== "spacemansystemsbackend" ||
  process.env.SPACEMAN_ENVIRONMENT !== "development" ||
  !apiKey
) {
  throw new Error(
    "Live marketplace tests require the named development project, environment guard, and web API key.",
  );
}

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: bucketName,
  });
}

const authentication = getAuth();
const database = getFirestore();
const bucket = getStorage().bucket();
const testRunId = `phase3_marketplace_${Date.now()}_${randomBytes(4).toString("hex")}`;
const password = `T3st-${randomBytes(16).toString("base64url")}`;
const superAdminEmail = `${testRunId}_super_admin@example.com`;
const merchantEmail = `${testRunId}_merchant@example.com`;
const fixtureEmails = new Set([superAdminEmail, merchantEmail]);
const createdUserIds = new Set();
const trackedPaths = new Set();
const trackedTargetIds = new Set();
const importBatchIds = new Set();
const storagePrefixes = new Set();
const storeAId = `${testRunId}_store_a`;
const storeBId = `${testRunId}_store_b`;
const inactiveStoreId = `${testRunId}_inactive_store`;
const inactiveItemId = `${testRunId}_inactive_item`;

function track(reference) {
  trackedPaths.add(reference.path);
  trackedTargetIds.add(reference.id);
  return reference;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 200) };
    }
  }
  return { status: response.status, body };
}

function requireStatus(label, actual, expected) {
  if (!expected.includes(actual)) {
    throw new Error(
      `${label} returned HTTP ${actual}; expected ${expected.join(" or ")}.`,
    );
  }
}

function commandId(label, response) {
  requireStatus(label, response.status, [200]);
  const id = response.body?.result?.id;
  if (typeof id !== "string")
    throw new Error(`${label} returned no command result ID.`);
  return id;
}

async function callFunction(name, token, data) {
  return jsonRequest(
    `https://${region}-${projectId}.cloudfunctions.net/${name}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ data }),
    },
  );
}

async function signInWithPassword(email) {
  const response = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  requireStatus("Password sign-in", response.status, [200]);
  if (typeof response.body?.idToken !== "string")
    throw new Error("Password sign-in returned no ID token.");
  return response.body.idToken;
}

function firestoreDocumentUrl(collectionName, documentId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${documentId}?key=${encodeURIComponent(apiKey)}`;
}

function readFirestoreDocument(collectionName, documentId, token) {
  return jsonRequest(firestoreDocumentUrl(collectionName, documentId), {
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
}

function runFirestoreQuery(structuredQuery, token) {
  return jsonRequest(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({ structuredQuery }),
    },
  );
}

async function createActor(email, displayName, role, status, scope) {
  const account = await authentication.createUser({
    email,
    displayName,
    password,
    emailVerified: true,
    disabled: false,
  });
  createdUserIds.add(account.uid);
  await authentication.setCustomUserClaims(account.uid, {
    role,
    status,
    ...scope,
  });
  const reference = track(database.collection("users").doc(account.uid));
  await reference.set({
    id: account.uid,
    email,
    displayName,
    role,
    status,
    scope,
    schemaVersion: 1,
    testRunId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: account.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: account.uid,
  });
  return account.uid;
}

async function tagDocument(collectionName, documentId) {
  const reference = track(database.collection(collectionName).doc(documentId));
  await reference.set({ testRunId }, { merge: true });
}

async function tagImportBatch(batchId) {
  importBatchIds.add(batchId);
  await tagDocument("importBatches", batchId);
  const rows = await database
    .collection("importBatches")
    .doc(batchId)
    .collection("rows")
    .get();
  await Promise.all(
    rows.docs.map((snapshot) => {
      trackedPaths.add(snapshot.ref.path);
      return snapshot.ref.set({ testRunId }, { merge: true });
    }),
  );
}

async function tagImportedItems(batchId) {
  const snapshots = await database
    .collection("items")
    .where("importBatchId", "==", batchId)
    .get();
  await Promise.all(
    snapshots.docs.map((snapshot) => {
      track(snapshot.ref);
      return snapshot.ref.set({ testRunId }, { merge: true });
    }),
  );
  return snapshots.size;
}

async function tagAuditRecords() {
  const references = new Map();
  for (const uid of createdUserIds) {
    for (const fieldName of ["actorId", "targetId"]) {
      const snapshots = await database
        .collection("auditLogs")
        .where(fieldName, "==", uid)
        .get();
      snapshots.docs.forEach((snapshot) =>
        references.set(snapshot.ref.path, snapshot.ref),
      );
    }
  }
  for (const targetId of trackedTargetIds) {
    const snapshots = await database
      .collection("auditLogs")
      .where("targetId", "==", targetId)
      .get();
    snapshots.docs.forEach((snapshot) =>
      references.set(snapshot.ref.path, snapshot.ref),
    );
  }
  await Promise.all(
    [...references.values()].map((reference) => {
      track(reference);
      return reference.set({ testRunId }, { merge: true });
    }),
  );
}

async function uploadStorageObject(path, token, contentType, body) {
  return jsonRequest(
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        authorization: `Firebase ${token}`,
        "content-type": contentType,
      },
      body,
    },
  );
}

async function cleanup() {
  await tagAuditRecords().catch(() => undefined);
  for (const batchId of importBatchIds) {
    const rows = await database
      .collection("importBatches")
      .doc(batchId)
      .collection("rows")
      .get();
    rows.docs.forEach((snapshot) => trackedPaths.add(snapshot.ref.path));
  }
  const taggedCollections = [
    "users",
    "stores",
    "items",
    "importBatches",
    "auditLogs",
  ];
  for (const collectionName of taggedCollections) {
    const snapshots = await database
      .collection(collectionName)
      .where("testRunId", "==", testRunId)
      .get();
    snapshots.docs.forEach((snapshot) => trackedPaths.add(snapshot.ref.path));
  }
  const paths = [...trackedPaths].sort(
    (left, right) => right.split("/").length - left.split("/").length,
  );
  for (let index = 0; index < paths.length; index += 400) {
    const batch = database.batch();
    paths
      .slice(index, index + 400)
      .forEach((path) => batch.delete(database.doc(path)));
    await batch.commit();
  }
  for (const prefix of storagePrefixes) {
    await bucket.deleteFiles({ prefix, force: true });
  }
  const listedUsers = await authentication.listUsers();
  listedUsers.users.forEach((account) => {
    if (account.email && fixtureEmails.has(account.email))
      createdUserIds.add(account.uid);
  });
  await Promise.all(
    [...createdUserIds].map((uid) =>
      authentication.deleteUser(uid).catch((error) => {
        if (error?.code !== "auth/user-not-found") throw error;
      }),
    ),
  );
}

async function verifyCleanup() {
  for (const collectionName of [
    "users",
    "stores",
    "items",
    "importBatches",
    "auditLogs",
  ]) {
    const snapshot = await database
      .collection(collectionName)
      .where("testRunId", "==", testRunId)
      .limit(1)
      .get();
    if (!snapshot.empty)
      throw new Error(
        `Cleanup left tagged ${collectionName} documents for ${testRunId}.`,
      );
  }
  for (const batchId of importBatchIds) {
    const rows = await database
      .collection("importBatches")
      .doc(batchId)
      .collection("rows")
      .limit(1)
      .get();
    if (!rows.empty)
      throw new Error(`Cleanup left import rows for ${batchId}.`);
  }
  for (const prefix of storagePrefixes) {
    const [files] = await bucket.getFiles({ prefix, maxResults: 1 });
    if (files.length > 0)
      throw new Error(`Cleanup left Storage objects under ${prefix}.`);
  }
  for (const uid of createdUserIds) {
    const remaining = await authentication.getUser(uid).then(
      () => true,
      (error) => {
        if (error?.code === "auth/user-not-found") return false;
        throw error;
      },
    );
    if (remaining) throw new Error(`Cleanup left Firebase Auth user ${uid}.`);
  }
}

const emptyScope = { storeIds: [], deliveryZoneIds: [], regionIds: [] };
const address = {
  label: "Phase 3 development fixture",
  formattedAddress: "Mabopane, South Africa",
  coordinates: { latitude: -25.5407, longitude: 28.1007 },
};

try {
  const superAdminUid = await createActor(
    superAdminEmail,
    "Phase 3 live super admin",
    "super_admin",
    "active",
    emptyScope,
  );
  const merchantUid = await createActor(
    merchantEmail,
    "Phase 3 live merchant",
    "merchant",
    "pending_approval",
    emptyScope,
  );
  const superAdminToken = await signInWithPassword(superAdminEmail);
  const unscopedMerchantToken = await signInWithPassword(merchantEmail);

  const storeA = await callFunction("upsertStore", superAdminToken, {
    storeId: storeAId,
    merchantId: merchantUid,
    name: "Phase 3 Development Kitchen",
    category: "Restaurant",
    description: "Disposable marketplace live-test store.",
    status: "active",
    deliveryZoneIds: [`${testRunId}_zone`],
    address,
    openingHours: [],
    openForOrders: true,
    minimumOrder: { amountMinor: 5_000, currency: "ZAR" },
  });
  commandId("Manual store publication", storeA);
  await tagDocument("stores", storeAId);

  const storeB = await callFunction("upsertStore", superAdminToken, {
    storeId: storeBId,
    merchantId: superAdminUid,
    name: "Phase 3 Cross-scope Store",
    category: "Restaurant",
    description: "Cross-store denial fixture.",
    status: "active",
    deliveryZoneIds: [`${testRunId}_zone`],
    address,
    openingHours: [],
    openForOrders: false,
    minimumOrder: { amountMinor: 0, currency: "ZAR" },
  });
  commandId("Cross-scope store publication", storeB);
  await tagDocument("stores", storeBId);

  const itemCreate = await callFunction("upsertItem", superAdminToken, {
    storeId: storeAId,
    name: "Phase 3 Development Burger",
    description: "Disposable manual catalog fixture.",
    status: "active",
    available: false,
    price: { amountMinor: 8_500, currency: "ZAR" },
    categoryLabel: "Meals",
    sortOrder: 1,
    source: "manual",
    imageAlt: "Development burger",
  });
  const manualItemId = commandId("Manual item publication", itemCreate);
  await tagDocument("items", manualItemId);

  const publicStore = await readFirestoreDocument("stores", storeAId);
  requireStatus("Guest active store read", publicStore.status, [200]);
  const publicUnavailableItem = await readFirestoreDocument(
    "items",
    manualItemId,
  );
  requireStatus(
    "Guest unavailable-item state read",
    publicUnavailableItem.status,
    [200],
  );
  const publicSearchQuery = await runFirestoreQuery({
    from: [{ collectionId: "stores" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: "active" },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: "approvalState" },
              op: "EQUAL",
              value: { stringValue: "approved" },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: "searchName" },
              op: "GREATER_THAN_OR_EQUAL",
              value: { stringValue: "phase 3" },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: "searchName" },
              op: "LESS_THAN_OR_EQUAL",
              value: { stringValue: "phase 3\uf8ff" },
            },
          },
        ],
      },
    },
    orderBy: [
      { field: { fieldPath: "searchName" }, direction: "ASCENDING" },
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ],
    limit: 50,
  });
  requireStatus(
    "Guest active-store prefix query",
    publicSearchQuery.status,
    [200],
  );

  const inactiveStoreReference = track(
    database.collection("stores").doc(inactiveStoreId),
  );
  const inactiveItemReference = track(
    database.collection("items").doc(inactiveItemId),
  );
  const inactiveBatch = database.batch();
  inactiveBatch.set(inactiveStoreReference, {
    id: inactiveStoreId,
    merchantId: merchantUid,
    name: "Inactive parent",
    searchName: "inactive parent",
    category: "Restaurant",
    status: "suspended",
    approvalState: "approved",
    testRunId,
  });
  inactiveBatch.set(inactiveItemReference, {
    id: inactiveItemId,
    storeId: inactiveStoreId,
    name: "Hidden child",
    searchName: "hidden child",
    status: "active",
    available: true,
    testRunId,
  });
  await inactiveBatch.commit();
  const inactiveParentItem = await readFirestoreDocument(
    "items",
    inactiveItemId,
  );
  requireStatus(
    "Inactive-parent item denial",
    inactiveParentItem.status,
    [403, 404],
  );

  const directWrite = await jsonRequest(
    `${firestoreDocumentUrl("items", manualItemId)}&updateMask.fieldPaths=name`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fields: { name: { stringValue: "Forbidden direct edit" } },
      }),
    },
  );
  requireStatus("Direct marketplace write denial", directWrite.status, [403]);

  const crossStoreItem = await callFunction(
    "upsertItem",
    unscopedMerchantToken,
    {
      storeId: storeBId,
      name: "Forbidden cross-store item",
      status: "active",
      price: { amountMinor: 1_000, currency: "ZAR" },
    },
  );
  requireStatus(
    "Merchant cross-store command denial",
    crossStoreItem.status,
    [403],
  );

  const rejectedSubmission = await callFunction(
    "submitMerchantStore",
    unscopedMerchantToken,
    {
      name: "Phase 3 Rejected Submission",
      category: "Restaurant",
      description: "Rejection lifecycle fixture.",
      address,
      openingHours: [],
      minimumOrder: { amountMinor: 0, currency: "ZAR" },
    },
  );
  const rejectedStoreId = commandId(
    "Merchant draft submission for rejection",
    rejectedSubmission,
  );
  await tagDocument("stores", rejectedStoreId);
  const pendingStoreQuery = await runFirestoreQuery(
    {
      from: [{ collectionId: "stores" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "merchantId" },
                op: "EQUAL",
                value: { stringValue: merchantUid },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "draft" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "approvalState" },
                op: "EQUAL",
                value: { stringValue: "pending" },
              },
            },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
      limit: 50,
    },
    unscopedMerchantToken,
  );
  requireStatus(
    "Pending merchant own-draft query",
    pendingStoreQuery.status,
    [200],
  );
  const rejection = await callFunction(
    "reviewStoreSubmission",
    superAdminToken,
    {
      storeId: rejectedStoreId,
      decision: "reject",
      reason: "Live-test rejection",
    },
  );
  commandId("Merchant submission rejection", rejection);
  const rejectedPublicRead = await readFirestoreDocument(
    "stores",
    rejectedStoreId,
  );
  requireStatus(
    "Rejected store public denial",
    rejectedPublicRead.status,
    [403, 404],
  );
  const rejectedOwnerQuery = await runFirestoreQuery(
    {
      from: [{ collectionId: "stores" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "merchantId" },
                op: "EQUAL",
                value: { stringValue: merchantUid },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "draft" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "approvalState" },
                op: "IN",
                value: {
                  arrayValue: {
                    values: [
                      { stringValue: "pending" },
                      { stringValue: "rejected" },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
      limit: 50,
    },
    unscopedMerchantToken,
  );
  requireStatus(
    "Pending merchant rejected-draft query",
    rejectedOwnerQuery.status,
    [200],
  );
  if (!JSON.stringify(rejectedOwnerQuery.body).includes(rejectedStoreId)) {
    throw new Error("Rejected merchant store was not returned to its owner.");
  }
  const correctedSubmission = await callFunction(
    "submitMerchantStore",
    unscopedMerchantToken,
    {
      storeId: rejectedStoreId,
      name: "Phase 3 Corrected Merchant Store",
      category: "Restaurant",
      description: "Corrected on the original rejected store record.",
      address,
      openingHours: [],
      minimumOrder: { amountMinor: 1_500, currency: "ZAR" },
    },
  );
  const correctedStoreId = commandId(
    "Merchant same-record correction and resubmission",
    correctedSubmission,
  );
  if (correctedStoreId !== rejectedStoreId) {
    throw new Error("Merchant correction created a replacement store record.");
  }
  const correctedSnapshot = await database
    .collection("stores")
    .doc(rejectedStoreId)
    .get();
  if (
    correctedSnapshot.get("approvalState") !== "pending" ||
    correctedSnapshot.get("rejectionReason") !== undefined
  ) {
    throw new Error(
      "Corrected merchant store did not return to a clean pending state.",
    );
  }
  const approvedStoreId = rejectedStoreId;
  const approval = await callFunction(
    "reviewStoreSubmission",
    superAdminToken,
    {
      storeId: approvedStoreId,
      decision: "approve",
      deliveryZoneIds: [`${testRunId}_zone`],
    },
  );
  commandId("Merchant submission approval", approval);
  const scopedMerchantToken = await signInWithPassword(merchantEmail);
  const merchantUpdate = await callFunction(
    "updateMerchantStore",
    scopedMerchantToken,
    {
      storeId: approvedStoreId,
      name: "Phase 3 Approved Merchant Store",
      category: "Restaurant",
      description: "Scoped merchant update passed.",
      openingHours: [],
      openForOrders: true,
      minimumOrder: { amountMinor: 2_000, currency: "ZAR" },
    },
  );
  commandId("Scoped merchant store update", merchantUpdate);
  const merchantItem = await callFunction("upsertItem", scopedMerchantToken, {
    storeId: approvedStoreId,
    name: "Phase 3 Merchant Meal",
    status: "active",
    available: true,
    price: { amountMinor: 4_500, currency: "ZAR" },
    categoryLabel: "Meals",
    sortOrder: 1,
    source: "merchant",
    imageAlt: "Merchant meal",
  });
  const merchantItemId = commandId("Scoped merchant item upsert", merchantItem);
  await tagDocument("items", merchantItemId);
  const scopedCrossStore = await callFunction(
    "upsertItem",
    scopedMerchantToken,
    {
      storeId: storeBId,
      name: "Forbidden scoped cross-store item",
      status: "active",
      price: { amountMinor: 1_000, currency: "ZAR" },
    },
  );
  requireStatus(
    "Scoped merchant cross-store denial",
    scopedCrossStore.status,
    [403],
  );

  const csv = await readFile(
    new URL("../fixtures/marketplace-items.csv", import.meta.url),
    "utf8",
  );
  const csvStage = await callFunction(
    "stageCsvCatalogImport",
    superAdminToken,
    { storeId: storeAId, csv },
  );
  const csvBatchId = commandId("CSV import staging", csvStage);
  await tagImportBatch(csvBatchId);
  const csvRows = await database
    .collection("importBatches")
    .doc(csvBatchId)
    .collection("rows")
    .where("valid", "==", true)
    .orderBy("rowNumber")
    .get();
  if (csvRows.empty)
    throw new Error("CSV staging produced no valid preview rows.");
  const selectedCsvRowIds = [csvRows.docs[0].id];
  const csvCommit = await callFunction("commitCatalogImport", superAdminToken, {
    batchId: csvBatchId,
    selectedRowIds: selectedCsvRowIds,
  });
  commandId("CSV selected-row commit", csvCommit);
  const csvItemCount = await tagImportedItems(csvBatchId);
  if (csvItemCount !== 1)
    throw new Error(
      `CSV selected commit created ${csvItemCount} items instead of 1.`,
    );
  const csvReplay = await callFunction("commitCatalogImport", superAdminToken, {
    batchId: csvBatchId,
    selectedRowIds: selectedCsvRowIds,
  });
  commandId("CSV idempotent replay", csvReplay);
  if ((await tagImportedItems(csvBatchId)) !== csvItemCount)
    throw new Error("CSV replay changed the imported item count.");

  const places = await callFunction("searchStorePlaces", superAdminToken, {
    query: googlePlaceQuery,
  });
  requireStatus("Google Places store search", places.status, [200]);
  const place = places.body?.result?.[0];
  if (typeof place?.placeId !== "string")
    throw new Error("Google Places search returned no candidate.");
  const googleStage = await callFunction(
    "stageGoogleStoreImport",
    superAdminToken,
    {
      placeId: place.placeId,
      merchantId: merchantUid,
    },
  );
  const googleBatchId = commandId("Google Places store staging", googleStage);
  await tagImportBatch(googleBatchId);

  const storagePrefix = `catalog/${storeAId}/staging/${superAdminUid}/${testRunId}`;
  storagePrefixes.add(storagePrefix);
  const invalidMedia = await uploadStorageObject(
    `${storagePrefix}/invalid.txt`,
    superAdminToken,
    "text/plain",
    "invalid",
  );
  requireStatus("Invalid media denial", invalidMedia.status, [401, 403]);
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7S8AAAAASUVORK5CYII=",
    "base64",
  );
  const validMedia = await uploadStorageObject(
    `${storagePrefix}/source.png`,
    superAdminToken,
    "image/png",
    onePixelPng,
  );
  if (validMedia.status !== 200) {
    throw new Error(
      `Scoped valid media upload returned HTTP ${validMedia.status}: ${JSON.stringify(validMedia.body)}`,
    );
  }
  const validThumbnail = await uploadStorageObject(
    `${storagePrefix}/thumbnail.png`,
    superAdminToken,
    "image/png",
    onePixelPng,
  );
  requireStatus(
    "Scoped valid media thumbnail upload",
    validThumbnail.status,
    [200],
  );
  const publishedPrefix = `catalog/${storeAId}/published/item/${manualItemId}/${testRunId}`;
  storagePrefixes.add(publishedPrefix);
  const publishMedia = await callFunction("upsertItem", superAdminToken, {
    itemId: manualItemId,
    storeId: storeAId,
    name: "Phase 3 Development Burger",
    description: "Disposable manual catalog fixture with published media.",
    status: "active",
    available: false,
    price: { amountMinor: 8_500, currency: "ZAR" },
    categoryLabel: "Meals",
    sortOrder: 1,
    source: "manual",
    imageAlt: "Development burger",
    media: {
      sourcePath: `${storagePrefix}/source.png`,
      thumbnailPath: `${storagePrefix}/thumbnail.png`,
      altText: "Development burger",
      contentType: "image/png",
      sizeBytes: onePixelPng.byteLength,
    },
  });
  commandId("Catalog media publication", publishMedia);
  const publishedItem = await database
    .collection("items")
    .doc(manualItemId)
    .get();
  const publishedMedia = publishedItem.data()?.media;
  if (
    publishedMedia?.sourcePath !== `${publishedPrefix}/source.png` ||
    publishedMedia?.thumbnailPath !== `${publishedPrefix}/thumbnail.png`
  ) {
    throw new Error(
      "Catalog media was not moved to its stable published paths.",
    );
  }
  const [stagedFiles] = await bucket.getFiles({ prefix: storagePrefix });
  if (stagedFiles.length !== 0)
    throw new Error("Catalog media publication left staged objects behind.");
  const [publishedFiles] = await bucket.getFiles({ prefix: publishedPrefix });
  if (publishedFiles.length !== 2)
    throw new Error(
      "Catalog media publication did not create both image variants.",
    );

  const retire = await callFunction("retireCatalogItem", superAdminToken, {
    itemId: manualItemId,
  });
  commandId("Catalog item retirement", retire);
  const retiredPublicRead = await readFirestoreDocument("items", manualItemId);
  requireStatus(
    "Retired item public denial",
    retiredPublicRead.status,
    [403, 404],
  );

  await database.collection("users").doc(merchantUid).update({
    status: "suspended",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: superAdminUid,
  });
  const staleMerchantMutation = await callFunction(
    "setItemAvailability",
    scopedMerchantToken,
    {
      itemId: merchantItemId,
      available: false,
    },
  );
  requireStatus(
    "Suspended stale-token command denial",
    staleMerchantMutation.status,
    [403],
  );

  await tagAuditRecords();
  console.log(
    JSON.stringify(
      {
        testRunId,
        manualStoreAndItemPublication: "passed",
        publicActiveAndUnavailableReads: "passed",
        publicSearchAndPendingMerchantQueries: "passed",
        inactiveParentAndRetiredItemDenied: "passed",
        directMarketplaceWriteDenied: "passed",
        merchantApprovalRejectionAndScope: "passed",
        crossStoreCommandsDenied: "passed",
        csvPreviewSelectionAndReplay: "passed",
        googlePlacesStoreStaging: "passed",
        validInvalidAndPublishedMedia: "passed",
        suspendedStaleTokenDenied: "passed",
      },
      null,
      2,
    ),
  );
} finally {
  await cleanup();
  await verifyCleanup();
  console.log("Live marketplace fixture cleanup completed and verified.");
}
