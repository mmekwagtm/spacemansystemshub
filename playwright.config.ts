import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web-e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 30_000
  },
  workers: 1,
  reporter: "list",
  use: {
    navigationTimeout: 90_000,
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "corepack pnpm --filter @spaceman/admin-web exec vite --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true
    },
    {
      command: "corepack pnpm --filter @spaceman/merchant-web exec vite --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: true
    },
    {
      command: "corepack pnpm --filter @spaceman/customer-web exec vite --host 127.0.0.1 --port 4175",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: true
    }
  ]
});
