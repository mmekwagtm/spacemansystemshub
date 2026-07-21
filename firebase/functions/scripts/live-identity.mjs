import { randomBytes } from "node:crypto";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const apiKey = process.env.SPACEMAN_FIREBASE_WEB_API_KEY;
const region = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const bucket = "spacemansystemsbackend.firebasestorage.app";

if (
  projectId !== "spacemansystemsbackend"
  || process.env.SPACEMAN_ENVIRONMENT !== "development"
  || !apiKey
) {
  throw new Error("Live identity tests require the named development project, environment guard, and web API key.");
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

const authentication = getAuth();
const database = getFirestore();
const testRunId = `phase2_identity_${Date.now()}_${randomBytes(4).toString("hex")}`;
const customerEmail = `${testRunId}_customer@example.com`;
const superAdminEmail = `${testRunId}_super_admin@example.com`;
const merchantEmail = `${testRunId}_merchant@example.com`;
const driverEmail = `${testRunId}_driver@example.com`;
const fixtureEmails = new Set([customerEmail, superAdminEmail, merchantEmail, driverEmail]);
const password = `T3st-${randomBytes(16).toString("base64url")}`;
const createdUserIds = new Set();
const storeAId = `${testRunId}_store_a`;
const storeBId = `${testRunId}_store_b`;
const ownAssignmentId = `${testRunId}_assignment_own`;
const otherAssignmentId = `${testRunId}_assignment_other`;
const notificationId = `${testRunId}_notification`;

async function jsonRequest(url, options) {
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
    throw new Error(`${label} returned HTTP ${actual}; expected ${expected.join(" or ")}.`);
  }
}

async function callFunction(name, token, data) {
  return jsonRequest(
    `https://${region}-${projectId}.cloudfunctions.net/${name}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ data })
    }
  );
}

async function signInWithPassword(email) {
  const signIn = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  requireStatus("Password sign-in", signIn.status, [200]);
  if (typeof signIn.body?.idToken !== "string") {
    throw new Error("Password sign-in returned no ID token.");
  }
  return signIn.body.idToken;
}

function firestoreDocumentUrl(collectionName, documentId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${documentId}?key=${encodeURIComponent(apiKey)}`;
}

async function readFirestoreDocument(collectionName, documentId, token) {
  return jsonRequest(firestoreDocumentUrl(collectionName, documentId), {
    headers: { authorization: `Bearer ${token}` }
  });
}

async function tagAuditRecords() {
  const references = new Map();
  for (const uid of createdUserIds) {
    for (const fieldName of ["actorId", "targetId"]) {
      const snapshots = await database.collection("auditLogs").where(fieldName, "==", uid).get();
      snapshots.docs.forEach((snapshot) => references.set(snapshot.ref.path, snapshot.ref));
    }
  }
  await Promise.all(
    [...references.values()].map((reference) => reference.set({ testRunId }, { merge: true }))
  );
}

async function cleanup() {
  const references = new Map();
  const taggedCollections = [
    "users",
    "auditLogs",
    "stores",
    "driverAssignments",
    "notifications"
  ];
  for (const collectionName of taggedCollections) {
    const tagged = await database.collection(collectionName).where("testRunId", "==", testRunId).get();
    tagged.docs.forEach((snapshot) => references.set(snapshot.ref.path, snapshot.ref));
  }
  for (const uid of createdUserIds) {
    const profileReference = database.collection("users").doc(uid);
    references.set(profileReference.path, profileReference);
    for (const fieldName of ["actorId", "targetId"]) {
      const snapshots = await database.collection("auditLogs").where(fieldName, "==", uid).get();
      snapshots.docs.forEach((snapshot) => references.set(snapshot.ref.path, snapshot.ref));
    }
  }

  const referenceList = [...references.values()];
  for (let index = 0; index < referenceList.length; index += 400) {
    const batch = database.batch();
    referenceList.slice(index, index + 400).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }

  const listedUsers = await authentication.listUsers();
  listedUsers.users.forEach((account) => {
    if (account.email && fixtureEmails.has(account.email)) createdUserIds.add(account.uid);
  });
  await Promise.all(
    [...createdUserIds].map((uid) => authentication.deleteUser(uid).catch((error) => {
      if (error?.code !== "auth/user-not-found") throw error;
    }))
  );
}

async function verifyCleanup() {
  const taggedCollections = [
    "users",
    "auditLogs",
    "stores",
    "driverAssignments",
    "notifications"
  ];
  const remainingSnapshots = await Promise.all(
    taggedCollections.map((collectionName) =>
      database.collection(collectionName).where("testRunId", "==", testRunId).limit(1).get()
    )
  );
  if (remainingSnapshots.some((snapshot) => !snapshot.empty)) {
    throw new Error(`Cleanup left tagged Firestore documents for ${testRunId}.`);
  }
  const remainingAccounts = await Promise.all(
    [...createdUserIds].map((uid) => authentication.getUser(uid).then(
      () => uid,
      (error) => {
        if (error?.code === "auth/user-not-found") return null;
        throw error;
      }
    ))
  );
  if (remainingAccounts.some((uid) => uid !== null)) {
    throw new Error(`Cleanup left Firebase Auth accounts for ${testRunId}.`);
  }
}

try {
  const signUp = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password, returnSecureToken: true })
    }
  );
  requireStatus("Auth sign-up", signUp.status, [200]);
  const customerUid = signUp.body?.localId;
  const initialCustomerToken = signUp.body?.idToken;
  if (typeof customerUid !== "string" || typeof initialCustomerToken !== "string") {
    throw new Error("Auth sign-up did not return a UID and ID token.");
  }
  createdUserIds.add(customerUid);

  const register = await callFunction(
    "registerCustomerProfile",
    initialCustomerToken,
    { displayName: "Phase 2 live test customer" }
  );
  requireStatus("Customer profile bootstrap", register.status, [200]);
  if (!register.body?.result?.id) throw new Error("Customer profile bootstrap returned no command result.");

  await database.collection("users").doc(customerUid).update({
    testRunId,
    updatedAt: FieldValue.serverTimestamp()
  });
  await tagAuditRecords();

  const unverifiedHealthcheck = await callFunction("healthcheck", initialCustomerToken, {});
  requireStatus("Unverified customer function denial", unverifiedHealthcheck.status, [403]);

  await authentication.updateUser(customerUid, { emailVerified: true });
  const customerSignIn = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password, returnSecureToken: true })
    }
  );
  requireStatus("Verified customer sign-in", customerSignIn.status, [200]);
  const customerToken = customerSignIn.body?.idToken;
  if (typeof customerToken !== "string") throw new Error("Verified customer sign-in returned no ID token.");

  const customerHealthcheck = await callFunction("healthcheck", customerToken, {});
  requireStatus("Verified customer function access", customerHealthcheck.status, [200]);

  const ownProfile = await readFirestoreDocument("users", customerUid, customerToken);
  requireStatus("Own profile read", ownProfile.status, [200]);

  const directWrite = await jsonRequest(
    `${firestoreDocumentUrl("users", customerUid)}&updateMask.fieldPaths=role`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${customerToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ fields: { role: { stringValue: "super_admin" } } })
    }
  );
  requireStatus("Protected role write denial", directWrite.status, [403]);

  const customerStaffCreation = await callFunction("createStaffUser", customerToken, {
    email: `${testRunId}_forbidden@example.com`,
    displayName: "Forbidden staff",
    role: "merchant",
    scope: { storeIds: [], deliveryZoneIds: [], regionIds: [] }
  });
  requireStatus("Cross-role staff creation denial", customerStaffCreation.status, [403]);

  const superAdminAccount = await authentication.createUser({
    email: superAdminEmail,
    displayName: "Phase 2 live super admin",
    password,
    emailVerified: true,
    disabled: false
  });
  createdUserIds.add(superAdminAccount.uid);
  const emptyScope = { storeIds: [], deliveryZoneIds: [], regionIds: [] };
  await authentication.setCustomUserClaims(superAdminAccount.uid, {
    role: "super_admin",
    status: "active",
    ...emptyScope
  });
  const superAdminProfile = database.collection("users").doc(superAdminAccount.uid);
  const bootstrapAudit = database.collection("auditLogs").doc();
  const bootstrapBatch = database.batch();
  bootstrapBatch.set(superAdminProfile, {
    id: superAdminAccount.uid,
    email: superAdminEmail,
    displayName: "Phase 2 live super admin",
    role: "super_admin",
    status: "active",
    scope: emptyScope,
    schemaVersion: 1,
    testRunId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: superAdminAccount.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: superAdminAccount.uid
  });
  bootstrapBatch.set(bootstrapAudit, {
    id: bootstrapAudit.id,
    actorId: superAdminAccount.uid,
    actorRole: "super_admin",
    action: "phase2_live_super_admin_created",
    targetType: "user",
    targetId: superAdminAccount.uid,
    testRunId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: superAdminAccount.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: superAdminAccount.uid
  });
  await bootstrapBatch.commit();
  const superAdminToken = await signInWithPassword(superAdminEmail);

  const createMerchant = await callFunction("createStaffUser", superAdminToken, {
    email: merchantEmail,
    displayName: "Phase 2 live merchant",
    role: "merchant",
    scope: emptyScope
  });
  requireStatus("Merchant invitation", createMerchant.status, [200]);
  const merchantUid = createMerchant.body?.result?.id;
  if (typeof merchantUid !== "string") throw new Error("Merchant invitation returned no user ID.");
  createdUserIds.add(merchantUid);

  const createDriver = await callFunction("createStaffUser", superAdminToken, {
    email: driverEmail,
    displayName: "Phase 2 live driver",
    role: "driver",
    scope: { storeIds: [], deliveryZoneIds: ["phase2-zone"], regionIds: [] }
  });
  requireStatus("Driver invitation", createDriver.status, [200]);
  const driverUid = createDriver.body?.result?.id;
  if (typeof driverUid !== "string") throw new Error("Driver invitation returned no user ID.");
  createdUserIds.add(driverUid);

  await Promise.all([
    authentication.updateUser(merchantUid, { password, emailVerified: true }),
    authentication.updateUser(driverUid, { password, emailVerified: true })
  ]);

  await Promise.all([
    database.collection("users").doc(merchantUid).set({ testRunId }, { merge: true }),
    database.collection("users").doc(driverUid).set({ testRunId }, { merge: true })
  ]);

  const merchantScope = { storeIds: [storeAId], deliveryZoneIds: ["phase2-zone"], regionIds: [] };
  const updateMerchantScope = await callFunction("updateUserScope", superAdminToken, {
    userId: merchantUid,
    scope: merchantScope
  });
  requireStatus("Merchant scope update", updateMerchantScope.status, [200]);

  const activateMerchant = await callFunction("updateUserStatus", superAdminToken, {
    userId: merchantUid,
    status: "active"
  });
  requireStatus("Merchant activation", activateMerchant.status, [200]);
  const activateDriver = await callFunction("updateUserStatus", superAdminToken, {
    userId: driverUid,
    status: "active"
  });
  requireStatus("Driver activation", activateDriver.status, [200]);

  const replayedActivation = await callFunction("updateUserStatus", superAdminToken, {
    userId: merchantUid,
    status: "active"
  });
  requireStatus("Replayed status transition denial", replayedActivation.status, [400]);

  const merchantToken = await signInWithPassword(merchantEmail);
  const driverToken = await signInWithPassword(driverEmail);
  const merchantRoleDenial = await callFunction("createStaffUser", merchantToken, {
    email: `${testRunId}_merchant_forbidden@example.com`,
    displayName: "Forbidden merchant-created staff",
    role: "driver",
    scope: emptyScope
  });
  requireStatus("Merchant staff creation denial", merchantRoleDenial.status, [403]);

  const crossUserProfile = await readFirestoreDocument("users", customerUid, merchantToken);
  requireStatus("Cross-user profile denial", crossUserProfile.status, [403]);

  const fixtureBatch = database.batch();
  fixtureBatch.set(database.collection("stores").doc(storeAId), {
    id: storeAId,
    merchantId: merchantUid,
    name: "Phase 2 scoped store",
    status: "draft",
    testRunId
  });
  fixtureBatch.set(database.collection("stores").doc(storeBId), {
    id: storeBId,
    merchantId: "another-merchant",
    name: "Phase 2 out-of-scope store",
    status: "draft",
    testRunId
  });
  fixtureBatch.set(database.collection("driverAssignments").doc(ownAssignmentId), {
    orderId: ownAssignmentId,
    driverId: driverUid,
    storeId: storeAId,
    testRunId
  });
  fixtureBatch.set(database.collection("driverAssignments").doc(otherAssignmentId), {
    orderId: otherAssignmentId,
    driverId: "another-driver",
    storeId: storeBId,
    testRunId
  });
  fixtureBatch.set(database.collection("notifications").doc(notificationId), {
    id: notificationId,
    recipientId: merchantUid,
    title: "Phase 2 canonical status probe",
    testRunId
  });
  await fixtureBatch.commit();

  const scopedStore = await readFirestoreDocument("stores", storeAId, merchantToken);
  requireStatus("Merchant in-scope store read", scopedStore.status, [200]);
  const crossStore = await readFirestoreDocument("stores", storeBId, merchantToken);
  requireStatus("Merchant cross-store denial", crossStore.status, [403]);
  const ownAssignment = await readFirestoreDocument("driverAssignments", ownAssignmentId, driverToken);
  requireStatus("Driver assigned-order read", ownAssignment.status, [200]);
  const crossAssignment = await readFirestoreDocument("driverAssignments", otherAssignmentId, driverToken);
  requireStatus("Driver cross-assignment denial", crossAssignment.status, [403]);
  const activeNotification = await readFirestoreDocument("notifications", notificationId, merchantToken);
  requireStatus("Active merchant protected read", activeNotification.status, [200]);

  const suspendMerchant = await callFunction("updateUserStatus", superAdminToken, {
    userId: merchantUid,
    status: "suspended"
  });
  requireStatus("Merchant suspension", suspendMerchant.status, [200]);
  const archiveDriver = await callFunction("updateUserStatus", superAdminToken, {
    userId: driverUid,
    status: "archived"
  });
  requireStatus("Driver archive", archiveDriver.status, [200]);

  const staleMerchantFunction = await callFunction("healthcheck", merchantToken, {});
  requireStatus("Suspended stale-token Function denial", staleMerchantFunction.status, [403]);
  const staleMerchantRead = await readFirestoreDocument("notifications", notificationId, merchantToken);
  requireStatus("Suspended stale-token Rules denial", staleMerchantRead.status, [403]);
  const staleDriverFunction = await callFunction("healthcheck", driverToken, {});
  requireStatus("Archived stale-token Function denial", staleDriverFunction.status, [403]);
  const staleDriverRead = await readFirestoreDocument("driverAssignments", ownAssignmentId, driverToken);
  requireStatus("Archived stale-token Rules denial", staleDriverRead.status, [403]);

  const storageWrite = await jsonRequest(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(`phase2/${testRunId}.txt`)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${customerToken}`,
        "content-type": "text/plain"
      },
      body: "denied"
    }
  );
  requireStatus("Storage write denial", storageWrite.status, [401, 403]);

  await tagAuditRecords();
  console.log(JSON.stringify({
    testRunId,
    customerRegistrationAndVerification: "passed",
    ownProfileRead: "passed",
    protectedRoleWriteDenied: "passed",
    crossRoleStaffCreationDenied: "passed",
    trustedStaffInvitationScopeAndActivation: "passed",
    replayedStatusTransitionDenied: "passed",
    crossUserProfileDenied: "passed",
    crossStoreDenied: "passed",
    crossDriverAssignmentDenied: "passed",
    suspendedAndArchivedStaleTokensDenied: "passed",
    directStorageWriteDenied: "passed"
  }, null, 2));
} finally {
  await cleanup();
  await verifyCleanup();
  console.log("Live identity fixture cleanup completed and verified.");
}
