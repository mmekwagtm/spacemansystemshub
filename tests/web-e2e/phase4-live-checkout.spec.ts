import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const root = process.cwd();
const adminEmail = process.env.PHASE4_ADMIN_EMAIL ?? "";
const adminPassword = process.env.PHASE4_ADMIN_PASSWORD ?? "";
const customerEmail = process.env.PHASE4_CUSTOMER_EMAIL ?? "";
const customerPassword = process.env.PHASE4_CUSTOMER_PASSWORD ?? "";
const storeName = process.env.PHASE4_STORE_NAME ?? "";
const itemName = process.env.PHASE4_ITEM_NAME ?? "";
const addressQuery =
  process.env.PHASE4_ADDRESS_QUERY ?? "Mabopane Central City";
const testRunId = process.env.PHASE4_TEST_RUN_ID ?? "";
const fixtureCollections = JSON.parse(
  fs.readFileSync(
    path.join(root, "firebase/functions/fixture-collections.json"),
    "utf8",
  ),
) as string[];
const evidenceDirectory = path.join(
  root,
  ".local-evidence",
  "phase4-playwright",
  testRunId,
);
let apiKey = "";

function requireEnvironment() {
  for (const [name, value] of Object.entries({
    PHASE4_ADMIN_EMAIL: adminEmail,
    PHASE4_ADMIN_PASSWORD: adminPassword,
    PHASE4_CUSTOMER_EMAIL: customerEmail,
    PHASE4_CUSTOMER_PASSWORD: customerPassword,
    PHASE4_STORE_NAME: storeName,
    PHASE4_ITEM_NAME: itemName,
    PHASE4_TEST_RUN_ID: testRunId,
  })) {
    if (!value) throw new Error(`Missing ${name} for Phase 4 browser checks.`);
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(testRunId))
    throw new Error("PHASE4_TEST_RUN_ID is not a safe evidence directory name.");
  const environment = fs.readFileSync(
    path.join(root, "apps/customer-web/.env.local"),
    "utf8",
  );
  apiKey =
    environment.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim() ?? "";
  if (!apiKey) throw new Error("Customer Web has no local Firebase API key.");
}

async function idToken(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { idToken?: string };
  if (!response.ok || !body.idToken)
    throw new Error("A Phase 4 cleanup identity token could not be obtained.");
  return body.idToken;
}

async function callFunction(name: string, token: string, data: unknown) {
  return fetch(
    `https://africa-south1-spacemansystemsbackend.cloudfunctions.net/${name}`,
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

async function signIn(page: Page) {
  const form = page.locator("form").filter({ hasText: "Sign in" }).first();
  await form.getByLabel("Email").fill(customerEmail);
  await form.getByLabel("Password").fill(customerPassword);
  await form.getByRole("button", { name: "Sign in" }).click();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  requireEnvironment();
});

test.afterAll(async () => {
  if (!apiKey || !testRunId || !adminEmail || !adminPassword) return;
  const token = await idToken(adminEmail, adminPassword);
  const cleanup = await callFunction("cleanupTestFixtures", token, {
    testRunId,
  });
  if (!cleanup.ok)
    throw new Error(
      `Exact Phase 4 cleanup failed with HTTP ${cleanup.status}.`,
    );
  const body = (await cleanup.json()) as {
    result?: { remaining?: number; collections?: string[] };
  };
  if (body.result?.remaining !== 0)
    throw new Error("Exact Phase 4 cleanup did not confirm zero residue.");
  const reported = body.result.collections ?? [];
  const missing = fixtureCollections.filter(
    (collectionName) => !reported.includes(collectionName),
  );
  const unsupported = reported.filter(
    (collectionName) => !fixtureCollections.includes(collectionName),
  );
  if (missing.length > 0 || unsupported.length > 0)
    throw new Error(
      `Exact Phase 4 cleanup coverage mismatch; missing=[${missing.join(",")}], unsupported=[${unsupported.join(",")}].`,
    );
});

test("Customer Web hosted-checkout owner acceptance", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4184", {
    waitUntil: "domcontentloaded",
  });
  const marketplace = page.getByRole("region", { name: "Active marketplace" });
  await expect(
    marketplace.getByText("Catalog cached and current", { exact: true }),
  ).toBeVisible();
  await marketplace.getByLabel("Search stores").fill(storeName);
  const store = marketplace.getByRole("article").filter({ hasText: storeName });
  await expect(store.first()).toBeVisible();
  await store.first().getByRole("button", { name: "View menu" }).click();
  const item = marketplace.getByRole("article").filter({ hasText: itemName });
  await expect(item.first()).toContainText("Available");
  await item.first().getByRole("button", { name: "Add to cart" }).click();

  const checkout = page.getByRole("region", { name: "Cart and checkout" });
  await expect(checkout).toContainText(storeName);
  await expect(checkout).toContainText("Your cart is saved");
  await checkout.getByRole("button", { name: "Continue to account" }).click();
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Customer account ready" }),
  ).toBeVisible();

  const address = checkout.getByLabel("Search a Mabopane delivery address");
  await context.setOffline(true);
  await address.fill("Mabopane test");
  await expect(
    checkout.getByRole("alert").filter({
      hasText: "Connect to the internet to search delivery addresses.",
    }),
  ).toBeVisible();
  await context.setOffline(false);
  await address.fill("");
  await address.fill(addressQuery);
  const candidate = checkout.getByRole("option").first();
  await expect(candidate).toBeVisible();
  await candidate.click();
  await checkout
    .getByRole("button", { name: "Calculate delivery quote" })
    .click();
  await expect(
    checkout.getByRole("heading", { name: "Review server quote" }),
  ).toBeVisible();
  await expect(checkout).toContainText("Route:");
  await expect(checkout).toContainText("Total:");

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await checkout.screenshot({
    path: path.join(evidenceDirectory, "customer-web-phase4-quote.png"),
  });

  const popupPromise = page.waitForEvent("popup");
  await checkout
    .getByRole("button", { name: "Pay securely with Paystack" })
    .click();
  const popup = await popupPromise;
  await popup.waitForURL(/https:\/\/checkout\.paystack\.com\//);
  await popup.close();
  await expect(
    checkout.getByRole("button", { name: "Check payment" }),
  ).toBeVisible();
  await checkout.screenshot({
    path: path.join(
      evidenceDirectory,
      "customer-web-phase4-payment-pending.png",
    ),
  });
});
