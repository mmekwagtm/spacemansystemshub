import { spawnSync } from "node:child_process";

const projectId = process.env.SPACEMAN_FIREBASE_PROJECT_ID ?? "";
const environment = process.env.SPACEMAN_ENVIRONMENT ?? "";
const currentVersion = process.env.PAYSTACK_CURRENT_SECRET_VERSION ?? "";
const nextVersion = process.env.PAYSTACK_NEXT_SECRET_VERSION ?? "";
const reference = process.env.PAYSTACK_ROTATION_REFERENCE ?? "";

if (!projectId) throw new Error("SPACEMAN_FIREBASE_PROJECT_ID is required.");
if (!["development", "production"].includes(environment))
  throw new Error("SPACEMAN_ENVIRONMENT must be development or production.");
if (!/^\d+$/.test(currentVersion))
  throw new Error("PAYSTACK_CURRENT_SECRET_VERSION must be numeric.");
if (nextVersion && (!/^\d+$/.test(nextVersion) || nextVersion === currentVersion))
  throw new Error(
    "PAYSTACK_NEXT_SECRET_VERSION must be a distinct numeric version.",
  );
if (!/^[A-Za-z0-9_-]{8,256}$/.test(reference))
  throw new Error("PAYSTACK_ROTATION_REFERENCE is missing or invalid.");

function gcloud(arguments_, label) {
  const result = spawnSync("gcloud", arguments_, {
    encoding: "utf8",
    maxBuffer: 1_000_000,
  });
  if (result.error || result.status !== 0)
    throw new Error(`${label} failed without exposing command output.`);
  return result.stdout.trim();
}

function describe(version) {
  const value = gcloud(
    [
      "secrets",
      "versions",
      "describe",
      version,
      "--secret=PAYSTACK_SECRET_KEY",
      `--project=${projectId}`,
      "--format=json",
    ],
    `Paystack secret version ${version} description`,
  );
  const description = JSON.parse(value);
  if (description.state !== "ENABLED")
    throw new Error(
      `Paystack secret version ${version} is not enabled for rotation verification.`,
    );
  return description.state;
}

function access(version) {
  return gcloud(
    [
      "secrets",
      "versions",
      "access",
      version,
      "--secret=PAYSTACK_SECRET_KEY",
      `--project=${projectId}`,
    ],
    `Paystack secret version ${version} access`,
  );
}

async function verifyProvider(version, secret) {
  const requiredPrefix =
    environment === "development" ? "sk_test_" : "sk_live_";
  const requiredDomain = environment === "development" ? "test" : "live";
  if (!secret.startsWith(requiredPrefix))
    throw new Error(
      `Paystack secret version ${version} does not match ${environment} mode.`,
    );
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { authorization: `Bearer ${secret}` } },
  );
  const responseText = await response.text();
  if (!response.ok)
    throw new Error(
      `Paystack secret version ${version} failed read-only provider verification.`,
    );
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Paystack secret version ${version} returned an invalid verification response.`,
    );
  }
  const domain = payload?.data?.domain;
  const transactionStatus = payload?.data?.status;
  if (
    payload?.status !== true ||
    domain !== requiredDomain ||
    typeof transactionStatus !== "string"
  )
    throw new Error(
      `Paystack secret version ${version} returned an unexpected verification result.`,
    );
  return {
    secretVersionId: version,
    secretManagerState: "ENABLED",
    paystackDomain: domain,
    verificationResult: "PASS",
    transactionStatus,
  };
}

const versions = [currentVersion, ...(nextVersion ? [nextVersion] : [])];
for (const version of versions) describe(version);
const secrets = versions.map((version) => access(version));
if (secrets.length === 2 && secrets[0] === secrets[1])
  throw new Error("Current and next Paystack versions must contain distinct keys.");
const results = [];
for (const [index, version] of versions.entries())
  results.push(await verifyProvider(version, secrets[index]));

console.log(
  JSON.stringify(
    {
      mode: nextVersion ? "rotation-grace-period" : "pre-rotation",
      results,
    },
    null,
    2,
  ),
);
