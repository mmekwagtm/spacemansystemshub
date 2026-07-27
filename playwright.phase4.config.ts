import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web-e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 600_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    navigationTimeout: 120_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phase4-owner-checkout",
      testMatch: "phase4-live-checkout.spec.ts",
    },
  ],
  webServer: {
    command:
      "corepack pnpm --filter @spaceman/customer-web exec vite preview --host 127.0.0.1 --port 4184",
    url: "http://127.0.0.1:4184",
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
