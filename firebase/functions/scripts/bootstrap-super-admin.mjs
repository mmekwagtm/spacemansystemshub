import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const emailArgument = process.argv.find((argument) => argument.startsWith("--email="));
const displayNameArgument = process.argv.find((argument) => argument.startsWith("--display-name="));
const email = emailArgument?.slice("--email=".length).trim().toLowerCase();
const displayName = displayNameArgument?.slice("--display-name=".length).trim() || "Spaceman Super Admin";

// Each allowed project must be named together with its exact environment.
const allowedEnvironments = {
  spacemansystemsbackend: "development",
  "projectsbackend-831c6": "production"
};
const expectedEnvironment = allowedEnvironments[projectId ?? ""];
if (!expectedEnvironment || process.env.SPACEMAN_ENVIRONMENT !== expectedEnvironment) {
  throw new Error(
    "Super-admin bootstrap needs GOOGLE_CLOUD_PROJECT and SPACEMAN_ENVIRONMENT set to an allowed pair: " +
      "spacemansystemsbackend + development, or projectsbackend-831c6 + production."
  );
}
if (!email || !email.includes("@")) {
  throw new Error("Pass the intended administrator email as --email=address@example.com.");
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

const authentication = getAuth();
const database = getFirestore();
let account;
try {
  account = await authentication.getUserByEmail(email);
} catch (error) {
  if (error?.code !== "auth/user-not-found") throw error;
  account = await authentication.createUser({ email, displayName, disabled: false });
}

const profileReference = database.collection("users").doc(account.uid);
const existing = await profileReference.get();
if (existing.exists && existing.get("role") !== "super_admin") {
  throw new Error("The supplied email already belongs to a non-super-admin platform profile.");
}

const scope = { storeIds: [], deliveryZoneIds: [], regionIds: [] };
const batch = database.batch();
batch.set(profileReference, {
  id: account.uid,
  email,
  displayName,
  role: "super_admin",
  status: "active",
  scope,
  schemaVersion: 1,
  ...(existing.exists ? {} : {
    createdAt: FieldValue.serverTimestamp(),
    createdBy: account.uid
  }),
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: account.uid
}, { merge: true });
const auditReference = database.collection("auditLogs").doc();
batch.create(auditReference, {
  id: auditReference.id,
  actorId: account.uid,
  actorRole: "super_admin",
  action: existing.exists ? "super_admin_bootstrap_refreshed" : "super_admin_bootstrapped",
  targetType: "user",
  targetId: account.uid,
  createdAt: FieldValue.serverTimestamp(),
  createdBy: account.uid,
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: account.uid
});
await batch.commit();
await authentication.updateUser(account.uid, { disabled: false, displayName });
await authentication.setCustomUserClaims(account.uid, {
  ...(account.customClaims ?? {}),
  role: "super_admin",
  status: "active",
  ...scope
});

console.log(`Super-admin profile and claims are ready in ${projectId} (${expectedEnvironment}).`);
console.log("Use the Admin web password-setup form for the supplied email, then sign in.");
