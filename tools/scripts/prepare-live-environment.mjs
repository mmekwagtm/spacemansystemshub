// Writes the ignored environment files for a live (production) build and
// Functions deploy, using the public Firebase web-app configuration that the
// owner's logged-in Firebase CLI returns. No secret is read or written here:
// Paystack and Maps keys stay in Firebase-managed secret storage.
//
// Usage (repository root, after `firebase login`):
//   corepack pnpm live:prepare -- --project=projectsbackend-831c6 [--support-phone=+27723329351] [--app-id=1:...:web:...]
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const functionsRegion = "africa-south1";
const webApps = ["customer-web", "admin-web", "merchant-web"];

const options = new Map(
  process.argv
    .slice(2)
    .filter((argument) => argument.startsWith("--"))
    .map((argument) => {
      const [key, ...value] = argument.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

const firebaserc = JSON.parse(
  readFileSync(path.join(root, ".firebaserc"), "utf8"),
);
const productionProject = firebaserc.projects?.production;
const projectId = options.get("project") ?? "";
if (typeof productionProject !== "string" || projectId !== productionProject)
  throw new Error(
    `Pass --project=${productionProject ?? "<production alias>"} explicitly; it must match the .firebaserc production alias.`,
  );

const supportPhone = options.get("support-phone") ?? "";
if (supportPhone && !/^\+[1-9]\d{6,14}$/.test(supportPhone))
  throw new Error(
    "--support-phone must be an E.164 number such as +27723329351.",
  );
const appId = options.get("app-id") ?? "";
if (appId && !/^1:\d+:web:[a-f0-9]+$/.test(appId))
  throw new Error(
    "--app-id must be a Firebase web app ID such as 1:123:web:abc.",
  );

function firebase(commandArguments) {
  const result = spawnSync(
    "corepack",
    [
      "pnpm",
      "exec",
      "firebase",
      ...commandArguments,
      "--project",
      projectId,
      "--json",
      "--non-interactive",
    ],
    { cwd: root, encoding: "utf8" },
  );
  const output = result.stdout ?? "";
  let parsed = null;
  try {
    parsed = JSON.parse(output.slice(output.indexOf("{")));
  } catch {
    parsed = null;
  }
  if (result.error || result.status !== 0 || parsed?.status !== "success") {
    const reason =
      (typeof parsed?.error === "string" && parsed.error) ||
      (result.error && result.error.message) ||
      `${result.stderr ?? ""}${output}`
        .trim()
        .split("\n")
        .slice(-3)
        .join(" ") ||
      "no output";
    throw new Error(
      `firebase ${commandArguments.join(" ")} failed: ${reason}\n` +
        "Check that the Firebase CLI is installed, you ran `firebase login`, and the project has exactly one web app " +
        '(or pass --app-id). Create one with: firebase apps:create WEB "Spaceman Web" --project ' +
        projectId,
    );
  }
  return parsed.result;
}

const result = firebase(["apps:sdkconfig", "WEB", ...(appId ? [appId] : [])]);
let sdkConfig = result?.sdkConfig;
if (!sdkConfig && typeof result?.fileContents === "string") {
  try {
    sdkConfig = JSON.parse(result.fileContents);
  } catch {
    sdkConfig = undefined;
  }
}
if (!sdkConfig || typeof sdkConfig !== "object")
  throw new Error("The Firebase CLI did not return a web app configuration.");

const required = {
  VITE_FIREBASE_API_KEY: sdkConfig.apiKey,
  VITE_FIREBASE_APP_ID: sdkConfig.appId,
  VITE_FIREBASE_AUTH_DOMAIN: sdkConfig.authDomain,
  VITE_FIREBASE_MESSAGING_SENDER_ID: sdkConfig.messagingSenderId,
  VITE_FIREBASE_PROJECT_ID: sdkConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: sdkConfig.storageBucket,
};
for (const [key, value] of Object.entries(required)) {
  if (typeof value !== "string" || !/^[\w.:@-]+$/.test(value))
    throw new Error(
      key === "VITE_FIREBASE_STORAGE_BUCKET"
        ? "The web app has no storage bucket yet. Open Storage in the Firebase console and finish 'Get started', then run this again."
        : `The web app configuration is missing a valid ${key}.`,
    );
}
if (required.VITE_FIREBASE_PROJECT_ID !== projectId)
  throw new Error(
    `The web app belongs to ${required.VITE_FIREBASE_PROJECT_ID}, not ${projectId}.`,
  );

function envFile(values) {
  return (
    [
      `# Written by \`corepack pnpm live:prepare\` for ${projectId}. Ignored by Git; do not commit.`,
      ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    ].join("\n") + "\n"
  );
}

const written = [];
for (const app of webApps) {
  const file = path.join("apps", app, ".env.live.local");
  writeFileSync(
    path.join(root, file),
    envFile({
      ...required,
      VITE_FUNCTIONS_REGION: functionsRegion,
      ...(app === "customer-web" && supportPhone
        ? { VITE_SUPPORT_PHONE_E164: supportPhone }
        : {}),
    }),
  );
  written.push(file);
}

const functionsFile = path.join("firebase", "functions", `.env.${projectId}`);
writeFileSync(
  path.join(root, functionsFile),
  envFile({
    SPACEMAN_ENVIRONMENT: "production",
    SPACEMAN_FUNCTIONS_REGION: functionsRegion,
    SPACEMAN_ENFORCE_APP_CHECK: "false",
  }),
);
written.push(functionsFile);

console.log(
  `Live environment prepared for ${projectId} (web app ${required.VITE_FIREBASE_APP_ID}).`,
);
for (const file of written) console.log(`  wrote ${file}`);
console.log("Next: corepack pnpm live:build");
