import { defineConfig, devices } from "@playwright/test";

process.env.PHASE3_TEST_RUN_ID ??= Date.now().toString();

export default defineConfig({
  testDir: "./tests/web-e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 360_000,
  expect: {
    timeout: 60_000
  },
  workers: 1,
  reporter: "list",
  use: {
    navigationTimeout: 120_000,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "phase3-matrix",
      testMatch: "phase3-live-matrix.spec.ts",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "phase3-continuation",
      dependencies: ["phase3-matrix"],
      testMatch: "phase3-live-continuation.spec.ts",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "web-foundations",
      testMatch: "web-foundations.spec.ts",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "corepack pnpm --filter @spaceman/admin-web exec vite preview --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      timeout: 180_000,
      reuseExistingServer: true
    },
    {
      command: "corepack pnpm --filter @spaceman/merchant-web exec vite preview --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      timeout: 180_000,
      reuseExistingServer: true
    },
    {
      command: "corepack pnpm --filter @spaceman/customer-web exec vite preview --host 127.0.0.1 --port 4175",
      url: "http://127.0.0.1:4175",
      timeout: 180_000,
      reuseExistingServer: true
    }
  ]
});
