import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const projectId =
  process.env.SPACEMAN_FIREBASE_PROJECT_ID ?? "spacemansystemsbackend";
const region = process.env.SPACEMAN_FUNCTIONS_REGION ?? "africa-south1";
const testRunId = process.env.PHASE4_TEST_RUN_ID ?? "";
const adminEmail = process.env.PHASE4_ADMIN_EMAIL ?? "";
const adminPassword = process.env.PHASE4_ADMIN_PASSWORD ?? "";

if (projectId !== "spacemansystemsbackend")
  throw new Error("Expo Go cleanup is restricted to the development project.");
if (!/^[A-Za-z0-9_-]{16,128}$/.test(testRunId))
  throw new Error("PHASE4_TEST_RUN_ID must be the exact safe Expo Go run ID.");
if (!adminEmail || !adminPassword)
  throw new Error("PHASE4_ADMIN_EMAIL and PHASE4_ADMIN_PASSWORD are required.");

const environment = readFileSync(
  path.join(root, "apps/customer-web/.env.local"),
  "utf8",
);
const apiKey =
  environment.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim() ?? "";
if (!apiKey) throw new Error("Customer Web has no local Firebase API key.");

const fixtureCollections = JSON.parse(
  readFileSync(
    path.join(root, "firebase/functions/fixture-collections.json"),
    "utf8",
  ),
);

const signInResponse = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      returnSecureToken: true,
    }),
  },
);
const signInBody = await signInResponse.json();
if (!signInResponse.ok || typeof signInBody.idToken !== "string")
  throw new Error("The cleanup identity could not be authenticated.");

const cleanupResponse = await fetch(
  `https://${region}-${projectId}.cloudfunctions.net/cleanupTestFixtures`,
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${signInBody.idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ data: { testRunId } }),
  },
);
const cleanupBody = await cleanupResponse.json();
if (!cleanupResponse.ok)
  throw new Error(
    `cleanupTestFixtures failed with HTTP ${cleanupResponse.status}.`,
  );
const result = cleanupBody.result;
if (result?.remaining !== 0)
  throw new Error("cleanupTestFixtures did not confirm zero residue.");

const reported = Array.isArray(result.collections) ? result.collections : [];
const missing = fixtureCollections.filter(
  (collectionName) => !reported.includes(collectionName),
);
const unsupported = reported.filter(
  (collectionName) => !fixtureCollections.includes(collectionName),
);
if (missing.length > 0 || unsupported.length > 0)
  throw new Error(
    `Cleanup coverage mismatch; missing=[${missing.join(",")}], unsupported=[${unsupported.join(",")}].`,
  );

console.log(
  `Exact Expo Go cleanup passed for ${testRunId}: ${result.deleted ?? 0} documents deleted, zero remaining.`,
);
