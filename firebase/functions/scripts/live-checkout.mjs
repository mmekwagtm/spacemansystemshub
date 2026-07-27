import { randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const apiKey = process.env.SPACEMAN_FIREBASE_WEB_API_KEY;
const region = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const completePayment = process.argv.includes("--complete-payment");

if (
  projectId !== "spacemansystemsbackend" ||
  process.env.SPACEMAN_ENVIRONMENT !== "development" ||
  !apiKey
) {
  throw new Error(
    "Live checkout tests require the named development project, environment guard, and web API key.",
  );
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

const authentication = getAuth();
const database = getFirestore();
const testRunId = `phase4_checkout_${Date.now()}_${randomBytes(4).toString("hex")}`;
const password = `T4st-${randomBytes(18).toString("base64url")}`;
const superAdminEmail = `${testRunId}_super_admin@example.com`;
const customerEmail = `${testRunId}_customer@example.com`;
const otherCustomerEmail = `${testRunId}_other_customer@example.com`;
const fixtureEmails = new Set([
  superAdminEmail,
  customerEmail,
  otherCustomerEmail,
]);
const createdUserIds = new Set();
const zoneId = `${testRunId}_zone`;
const storeId = `${testRunId}_store`;
const itemId = `${testRunId}_item`;
let superAdminToken;
let settingsBefore;
let settingsCaptured = false;

function report(label) {
  console.log(`PASS ${label}`);
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

function callableResult(label, response) {
  requireStatus(label, response.status, [200]);
  if (!("result" in (response.body ?? {})))
    throw new Error(`${label} returned no callable result.`);
  return response.body.result;
}

function requireCallableFailure(label, response) {
  if (response.status === 200)
    throw new Error(`${label} unexpectedly succeeded.`);
  report(label);
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

async function signIn(email) {
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

async function createActor(email, displayName, role) {
  const account = await authentication.createUser({
    email,
    displayName,
    password,
    emailVerified: true,
    disabled: false,
  });
  createdUserIds.add(account.uid);
  const status = "active";
  const scope = { storeIds: [], deliveryZoneIds: [], regionIds: [] };
  await authentication.setCustomUserClaims(account.uid, {
    role,
    status,
    ...scope,
  });
  await database.collection("users").doc(account.uid).set({
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

function firestoreUrl(collectionName, documentId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${documentId}?key=${encodeURIComponent(apiKey)}`;
}

async function directWrite(collectionName, documentId, token) {
  return jsonRequest(
    `${firestoreUrl(collectionName, documentId)}&updateMask.fieldPaths=testProbe`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fields: { testProbe: { stringValue: testRunId } },
      }),
    },
  );
}

async function deleteTaggedDocuments() {
  const collections = [
    "users",
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
  for (const collectionName of collections) {
    for (let page = 0; page < 100; page += 1) {
      const snapshot = await database
        .collection(collectionName)
        .where("testRunId", "==", testRunId)
        .limit(250)
        .get();
      if (snapshot.empty) break;
      const batch = database.batch();
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
      if (snapshot.size < 250) break;
    }
  }
}

async function cleanup() {
  if (superAdminToken) {
    await callFunction("cleanupTestFixtures", superAdminToken, {
      testRunId,
    }).catch(() => undefined);
  }
  await deleteTaggedDocuments();

  if (settingsCaptured) {
    const settingsReference = database
      .collection("platformSettings")
      .doc("default");
    if (settingsBefore?.exists)
      await settingsReference.set(settingsBefore.data());
    else await settingsReference.delete().catch(() => undefined);
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
    "checkoutSessions",
    "orders",
    "paymentEvents",
    "orderEvents",
    "notifications",
    "notificationOutbox",
    "auditLogs",
    "feeRules",
    "deliveryZones",
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
  for (const uid of createdUserIds) {
    const exists = await authentication.getUser(uid).then(
      () => true,
      (error) => {
        if (error?.code === "auth/user-not-found") return false;
        throw error;
      },
    );
    if (exists) throw new Error(`Cleanup left Firebase Auth user ${uid}.`);
  }
  report("exact Auth and Firestore cleanup");
}

function requireCandidate(label, result) {
  if (!Array.isArray(result) || result.length === 0)
    throw new Error(`${label} returned no address candidates.`);
  const candidate = result[0];
  if (
    typeof candidate?.placeId !== "string" ||
    typeof candidate?.formattedText !== "string"
  )
    throw new Error(`${label} returned an invalid address candidate.`);
  return candidate;
}

async function waitForOwnerPayment(authorizationUrl) {
  console.log(
    "OWNER ACTION: open the following Paystack test URL, complete one successful test payment, then return here.",
  );
  console.log(authorizationUrl);
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await terminal.question("Press Enter only after Paystack reports success: ");
  terminal.close();
}

const allDayHours = Array.from({ length: 7 }, (_, day) => ({
  day,
  closed: false,
  opensAt: "00:00",
  closesAt: "23:59",
}));

try {
  settingsBefore = await database
    .collection("platformSettings")
    .doc("default")
    .get();
  settingsCaptured = true;
  const superAdminUid = await createActor(
    superAdminEmail,
    "Phase 4 live super admin",
    "super_admin",
  );
  const customerUid = await createActor(
    customerEmail,
    "Phase 4 live customer",
    "customer",
  );
  await createActor(otherCustomerEmail, "Phase 4 cross-customer", "customer");
  superAdminToken = await signIn(superAdminEmail);
  const customerToken = await signIn(customerEmail);
  const otherCustomerToken = await signIn(otherCustomerEmail);
  report("isolated active test identities");

  callableResult(
    "Delivery-zone configuration",
    await callFunction("upsertDeliveryZone", superAdminToken, {
      deliveryZoneId: zoneId,
      name: "Phase 4 Mabopane test zone",
      active: true,
      countryCode: "ZA",
      allowedLocalities: ["Mabopane"],
      testRunId,
    }),
  );
  callableResult(
    "Immutable fee-rule publication",
    await callFunction("publishDeliveryFeeRule", superAdminToken, {
      deliveryZoneId: zoneId,
      name: "Phase 4 approved test fee",
      deliveryType: "standard",
      baseFee: { amountMinor: 2_000, currency: "ZAR" },
      includedDistanceMetres: 3_000,
      perKilometreFee: { amountMinor: 400, currency: "ZAR" },
      smallOrderThreshold: { amountMinor: 10_000, currency: "ZAR" },
      smallOrderSurcharge: { amountMinor: 1_000, currency: "ZAR" },
      minimumFee: { amountMinor: 2_000, currency: "ZAR" },
      maximumFee: { amountMinor: 8_000, currency: "ZAR" },
      effectiveFrom: new Date(Date.now() - 60_000).toISOString(),
      testRunId,
    }),
  );
  callableResult(
    "Fail-closed checkout enable flags",
    await callFunction("updateCheckoutSettings", superAdminToken, {
      customerOrderingEnabled: true,
      mapsQuoteEnabled: true,
      paystackEnabled: true,
      testRunId,
    }),
  );
  report("versioned zone, fee, and enable configuration");

  const now = FieldValue.serverTimestamp();
  await database
    .collection("stores")
    .doc(storeId)
    .set({
      id: storeId,
      merchantId: superAdminUid,
      name: "Phase 4 Development Kitchen",
      searchName: "phase 4 development kitchen",
      category: "Restaurant",
      description: "Disposable Phase 4 checkout fixture.",
      status: "active",
      approvalState: "approved",
      source: "manual",
      deliveryZoneIds: [zoneId],
      address: {
        label: "Phase 4 Development Kitchen",
        formattedAddress: "Mabopane, South Africa",
        coordinates: { latitude: -25.5407, longitude: 28.1007 },
        countryCode: "ZA",
        locality: "Mabopane",
      },
      openingHours: allDayHours,
      openForOrders: true,
      minimumOrder: { amountMinor: 5_000, currency: "ZAR" },
      testRunId,
      createdAt: now,
      createdBy: superAdminUid,
      updatedAt: now,
      updatedBy: superAdminUid,
    });
  await database
    .collection("items")
    .doc(itemId)
    .set({
      id: itemId,
      storeId,
      name: "Phase 4 Checkout Meal",
      searchName: "phase 4 checkout meal",
      description: "Disposable authoritative checkout item.",
      status: "active",
      available: true,
      price: { amountMinor: 11_000, currency: "ZAR" },
      categoryLabel: "Meals",
      sortOrder: 1,
      source: "manual",
      imageAlt: "Phase 4 checkout meal",
      testRunId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: superAdminUid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: superAdminUid,
    });
  report("open catalog fixture above minimum order");

  const shortSearch = await callFunction(
    "searchDeliveryAddresses",
    customerToken,
    { storeId, query: "Ma", sessionToken: randomUUID() },
  );
  requireCallableFailure("three-character address minimum", shortSearch);

  const addressSessionToken = randomUUID();
  const searchResult = callableResult(
    "Mabopane address search",
    await callFunction("searchDeliveryAddresses", customerToken, {
      storeId,
      query:
        process.env.SPACEMAN_MABOPANE_ADDRESS_QUERY ??
        "Mabopane Central City Shopping Centre",
      sessionToken: addressSessionToken,
    }),
  );
  const candidate = requireCandidate("Mabopane address search", searchResult);
  report("server-only Places autocomplete");

  const idempotencyKey = `${testRunId}_quote_success`;
  const quoteInput = {
    channel: "customer_web",
    idempotencyKey,
    storeId,
    lines: [{ itemId, quantity: 1 }],
    addressSelection: {
      placeId: candidate.placeId,
      sessionToken: addressSessionToken,
      label: "Phase 4 test delivery",
    },
    testRunId,
  };
  const quote = callableResult(
    "Authoritative Maps quote",
    await callFunction("createCheckoutSession", customerToken, quoteInput),
  );
  const checkoutSessionId = quote?.checkoutSession?.id;
  if (typeof checkoutSessionId !== "string")
    throw new Error("Authoritative quote returned no checkout session ID.");
  if (
    quote.checkoutSession.deliveryFee?.amountMinor < 2_000 ||
    quote.checkoutSession.deliveryFee?.amountMinor > 8_000
  )
    throw new Error("The quoted delivery fee escaped the configured clamp.");
  report("ZA locality, Routes distance/ETA, and clamped fee snapshot");

  const replay = callableResult(
    "Checkout idempotency replay",
    await callFunction("createCheckoutSession", customerToken, quoteInput),
  );
  if (replay?.checkoutSession?.id !== checkoutSessionId)
    throw new Error("Checkout idempotency returned a different session.");
  report("stable checkout idempotency");

  requireCallableFailure(
    "idempotency-key input conflict",
    await callFunction("createCheckoutSession", customerToken, {
      ...quoteInput,
      lines: [{ itemId, quantity: 2 }],
    }),
  );

  requireCallableFailure(
    "invalid place/provider failure",
    await callFunction("createCheckoutSession", customerToken, {
      ...quoteInput,
      idempotencyKey: `${testRunId}_invalid_place`,
      addressSelection: {
        ...quoteInput.addressSelection,
        placeId: `${testRunId}_not_a_place`,
      },
    }),
  );

  const outOfZoneToken = randomUUID();
  const outsideSearch = callableResult(
    "Out-of-zone candidate search",
    await callFunction("searchDeliveryAddresses", customerToken, {
      storeId,
      query:
        process.env.SPACEMAN_OUT_OF_ZONE_ADDRESS_QUERY ??
        "Union Buildings Pretoria",
      sessionToken: outOfZoneToken,
    }),
  );
  const outsideCandidate = requireCandidate(
    "Out-of-zone candidate search",
    outsideSearch,
  );
  requireCallableFailure(
    "out-of-zone checkout denial",
    await callFunction("createCheckoutSession", customerToken, {
      ...quoteInput,
      idempotencyKey: `${testRunId}_outside_zone`,
      addressSelection: {
        placeId: outsideCandidate.placeId,
        sessionToken: outOfZoneToken,
        label: "Outside zone",
      },
    }),
  );

  const directSessionWrite = await directWrite(
    "checkoutSessions",
    checkoutSessionId,
    customerToken,
  );
  requireStatus(
    "Direct checkout-session write denial",
    directSessionWrite.status,
    [403],
  );
  report("direct checkout-session write denial");
  const directOrderWrite = await directWrite(
    "orders",
    checkoutSessionId,
    customerToken,
  );
  requireStatus("Direct order write denial", directOrderWrite.status, [403]);
  report("direct order write denial");

  const crossCustomerRead = await jsonRequest(
    firestoreUrl("checkoutSessions", checkoutSessionId),
    { headers: { authorization: `Bearer ${otherCustomerToken}` } },
  );
  requireStatus(
    "Cross-customer checkout read denial",
    crossCustomerRead.status,
    [403, 404],
  );
  report("cross-customer checkout read denial");

  const unsignedWebhook = await jsonRequest(
    `https://${region}-${projectId}.cloudfunctions.net/handlePaystackWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "charge.success",
        data: {
          id: `${testRunId}_forged`,
          reference: `spc_${checkoutSessionId}`,
          status: "success",
        },
      }),
    },
  );
  requireStatus("Unsigned webhook denial", unsignedWebhook.status, [401]);
  report("unsigned webhook denial");

  await database.collection("items").doc(itemId).update({
    available: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  requireCallableFailure(
    "catalog-change quote denial",
    await callFunction("createCheckoutSession", customerToken, {
      ...quoteInput,
      idempotencyKey: `${testRunId}_catalog_change`,
    }),
  );
  await database.collection("items").doc(itemId).update({
    available: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const authorization = callableResult(
    "Paystack hosted-checkout initialization",
    await callFunction("initializePaystackPayment", customerToken, {
      checkoutSessionId,
    }),
  );
  if (
    typeof authorization?.authorizationUrl !== "string" ||
    new URL(authorization.authorizationUrl).hostname !== "checkout.paystack.com"
  )
    throw new Error("Paystack initialization returned an unapproved host.");
  report("server-owned Paystack amount, reference, and hosted URL");

  if (completePayment) {
    await waitForOwnerPayment(authorization.authorizationUrl);
    const verified = callableResult(
      "Successful Paystack verification",
      await callFunction("verifyPaystackPayment", customerToken, {
        checkoutSessionId,
      }),
    );
    if (verified?.status !== "paid" || verified?.orderId !== checkoutSessionId)
      throw new Error("The completed test payment did not create its order.");
    const replayed = callableResult(
      "Repeated payment verification",
      await callFunction("verifyPaystackPayment", customerToken, {
        checkoutSessionId,
      }),
    );
    if (replayed?.status !== "paid" || replayed?.orderId !== checkoutSessionId)
      throw new Error("Repeated verification did not return the same order.");
    const order = await database
      .collection("orders")
      .doc(checkoutSessionId)
      .get();
    if (!order.exists || order.data()?.testRunId !== testRunId)
      throw new Error("The verified payment produced no tagged order.");
    report("exactly-once paid order and repeated verification");
  } else {
    const unresolved = callableResult(
      "Unpaid/abandoned payment verification",
      await callFunction("verifyPaystackPayment", customerToken, {
        checkoutSessionId,
      }),
    );
    if (unresolved?.status === "paid")
      throw new Error(
        "An unpaid hosted checkout unexpectedly became an order.",
      );
    const order = await database
      .collection("orders")
      .doc(checkoutSessionId)
      .get();
    if (order.exists)
      throw new Error("An unpaid or abandoned payment created an order.");
    report("unpaid or abandoned checkout creates no order");
  }

  console.log(`Phase 4 live matrix passed for ${testRunId}.`);
} finally {
  await cleanup();
  await verifyCleanup();
}
