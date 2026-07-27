import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const required = [
  "PHASE4_ADMIN_EMAIL",
  "PHASE4_ADMIN_PASSWORD",
  "PHASE4_CUSTOMER_EMAIL",
  "PHASE4_CUSTOMER_PASSWORD",
  "PHASE4_STORE_NAME",
  "PHASE4_ITEM_NAME",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing Phase 4 owner-test environment variables: ${missing.join(", ")}.`,
  );
}

const testRunId =
  process.env.PHASE4_TEST_RUN_ID ??
  `phase4_playwright_${Date.now()}_${randomBytes(4).toString("hex")}`;
const environment = {
  ...process.env,
  PHASE4_TEST_RUN_ID: testRunId,
  VITE_PHASE4_TEST_RUN_ID: testRunId,
};

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} ${arguments_.join(" ")} failed with exit code ${result.status}.`,
    );
}

console.log(`Running isolated Phase 4 browser acceptance as ${testRunId}.`);
run("corepack", ["pnpm", "--filter", "@spaceman/customer-web", "build"]);
run("corepack", [
  "pnpm",
  "exec",
  "playwright",
  "test",
  "--config",
  "playwright.phase4.config.ts",
]);
