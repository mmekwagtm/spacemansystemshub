import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const root = process.cwd();
const evidenceDir = path.join(root, "docs/live-test-data-docs/images/phase3-images");
const adminEmail = process.env.PHASE3_ADMIN_EMAIL ?? "";
const adminPassword = process.env.PHASE3_ADMIN_PASSWORD ?? "";
const merchantEmail = process.env.PHASE3_MERCHANT_EMAIL ?? "";
const merchantPassword = process.env.PHASE3_MERCHANT_PASSWORD ?? "";
const customerEmail = process.env.PHASE3_CUSTOMER_EMAIL ?? "";
const customerPassword = process.env.PHASE3_CUSTOMER_PASSWORD ?? "";
const merchantUid = process.env.PHASE3_MERCHANT_UID ?? "";
const testRunId = process.env.PHASE3_TEST_RUN_ID ?? "";

const adminStoreName = `Playwright Admin Store ${testRunId}`;
const manualItemName = `Playwright Manual Item ${testRunId}`;
const draftName = `Playwright Merchant Same Record Draft ${testRunId}`;
const correctedName = `Playwright Merchant Same Record Corrected ${testRunId}`;

function requireFixtureEnvironment() {
  for (const [name, value] of Object.entries({
    PHASE3_ADMIN_EMAIL: adminEmail,
    PHASE3_ADMIN_PASSWORD: adminPassword,
    PHASE3_MERCHANT_EMAIL: merchantEmail,
    PHASE3_MERCHANT_PASSWORD: merchantPassword,
    PHASE3_CUSTOMER_EMAIL: customerEmail,
    PHASE3_CUSTOMER_PASSWORD: customerPassword,
    PHASE3_MERCHANT_UID: merchantUid,
    PHASE3_TEST_RUN_ID: testRunId,
  })) {
    if (!value) throw new Error(`Missing ${name} for live Phase 3 checks.`);
  }
}

async function signIn(page: Page, email: string, password: string) {
  const form = page.locator("form").filter({ hasText: "Sign in" }).first();
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
}

async function evidence(locator: Locator, filename: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await locator.screenshot({ path: path.join(evidenceDir, filename) });
}

async function idToken(
  apiKey: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { idToken?: string };
  if (!body.idToken) throw new Error("A Firebase ID token could not be obtained.");
  return body.idToken;
}

async function openStoreMenuWithItem(
  market: Locator,
  storeName: string,
  itemName: string,
) {
  const cards = market.getByRole("article").filter({ hasText: storeName });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    await cards.nth(index).getByRole("button", { name: "View menu" }).click();
    const item = market.getByRole("heading", { name: itemName }).first();
    try {
      await expect(item).toBeVisible({ timeout: 10_000 });
      return;
    } catch {
      // Retained development fixtures may share a display name; try the next store.
    }
  }

  throw new Error(`No ${storeName} fixture contains ${itemName}.`);
}

async function loadAllStorePages(market: Locator) {
  const storeCards = market.locator("article.store-card");
  const loadMore = market.getByRole("button", { name: "Load more stores" });
  while (await loadMore.count()) {
    const previousCount = await storeCards.count();
    await loadMore.click();
    await expect
      .poll(() => storeCards.count())
      .toBeGreaterThan(previousCount);
  }
}

test.describe.configure({ mode: "serial" });

test("Phase 3 continues from persisted Google, CSV, merchant, and customer state", async ({ page, browser }) => {
  test.setTimeout(900_000);
  requireFixtureEnvironment();

  await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
  await signIn(page, adminEmail, adminPassword);
  const adminMarket = page.getByRole("region", { name: "Marketplace operations" });
  await expect(adminMarket.getByRole("heading", { name: /API import/i })).toHaveCount(0);
  await expect(adminMarket.getByRole("button", { name: /API/i })).toHaveCount(0);
  const googleCard = adminMarket.getByRole("article").filter({ hasText: "KFC Mabopane North" }).first();
  await expect(googleCard.getByText("approved · active", { exact: true })).toBeVisible();

  const merchant = await browser.newPage();
  await merchant.goto("http://127.0.0.1:4174", { waitUntil: "domcontentloaded" });
  await signIn(merchant, merchantEmail, merchantPassword);
  const merchantMarket = merchant.getByRole("region", { name: "Merchant marketplace" });
  await expect(merchantMarket.getByRole("article").filter({ hasText: draftName })).toHaveCount(0);
  await merchant.reload({ waitUntil: "domcontentloaded" });
  await signIn(merchant, merchantEmail, merchantPassword);
  await expect(merchant.getByRole("heading", { name: "Merchant operations foundation" })).toBeVisible({ timeout: 90_000 });
  const approvedCard = merchantMarket.getByRole("article").filter({ hasText: correctedName }).first();
  await expect(approvedCard).toBeVisible({ timeout: 90_000 });
  await expect(approvedCard.getByText("approved · active", { exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(merchantMarket.getByText("Playwright Other Kitchen", { exact: true })).toHaveCount(0);
  await approvedCard.getByRole("button", { name: "Select store" }).click();
  const updateForm = merchantMarket.locator("form").filter({ hasText: "Update assigned store" });
  await updateForm.getByLabel("Description").fill("Continuation scope update only.");
  await updateForm.getByRole("button", { name: "Save store settings" }).click();
  await expect(merchant.getByText("Store presentation and operating state updated.", { exact: true })).toBeVisible();
  const envText = fs.readFileSync(path.join(root, "apps/merchant-web/.env.local"), "utf8");
  const apiKey = envText.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!apiKey) throw new Error("Could not read the local Firebase API key for the scoped denial check.");
  const merchantToken = await idToken(apiKey, merchantEmail, merchantPassword);
  const deniedResponse = await fetch(
    "https://africa-south1-spacemansystemsbackend.cloudfunctions.net/updateMerchantStore",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${merchantToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          storeId: "phase3-playwright-other-store",
          name: "Denied update",
          category: "Restaurant",
          description: "Should not be accepted.",
          openingHours: [],
          openForOrders: true,
          minimumOrder: { amountMinor: 0, currency: "ZAR" },
        },
      }),
    },
  );
  const deniedBody = await deniedResponse.text();
  expect(`${deniedResponse.status} ${deniedBody}`).toMatch(/permission|denied|scope/i);

  const customer = await browser.newPage();
  await customer.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  const customerMarket = customer.getByRole("region", { name: "Active marketplace" });
  await expect(customerMarket.getByText("Catalog cached and current", { exact: true })).toBeVisible();
  await loadAllStorePages(customerMarket);
  await customer.getByLabel("Search stores").fill(adminStoreName);
  await openStoreMenuWithItem(customerMarket, adminStoreName, manualItemName);
  await customer.getByRole("button", { name: "Continue to checkout" }).click();
  const customerSignIn = customer.locator("form").filter({ hasText: "Sign in" }).first();
  await customerSignIn.getByLabel("Email").fill(customerEmail);
  await customerSignIn.getByLabel("Password").fill(customerPassword);
  await customerSignIn.getByRole("button", { name: "Sign in" }).click();
  await expect(customer.getByRole("heading", { name: "Customer account ready" })).toBeVisible();
  await evidence(customerMarket, "playwright-customer-before-retirement.png");

  const adminStores = adminMarket.getByRole("article").filter({ hasText: adminStoreName });
  const adminStoreCount = await adminStores.count();
  expect(adminStoreCount).toBeGreaterThan(0);
  const targetStoreSelect = adminMarket.getByLabel("Target store");
  await targetStoreSelect.selectOption({ label: adminStoreName });
  const adminStoreId = await targetStoreSelect.inputValue();
  expect(adminStoreId).not.toBe("");
  for (let index = 0; index < adminStoreCount; index += 1) {
    await adminStores.nth(index).getByRole("button", { name: "Manage catalog" }).click();
    const managed = adminMarket.locator("section.subpanel").filter({ hasText: "Managed items" });
    await expect(managed.getByRole("heading", { name: "Playwright Juice" })).toHaveCount(0);
    await expect(managed.getByRole("heading", { name: "Playwright Cookie" })).toHaveCount(0);
    const manualCards = managed.getByRole("article").filter({ hasText: manualItemName });
    if (await manualCards.count()) {
      await manualCards.first().getByRole("button", { name: "Retire item" }).click();
      await expect(page.getByText("Item retired.", { exact: true })).toBeVisible();
    }
  }
  await evidence(adminMarket, "playwright-admin-csv-retirement-continuation.png");

  const adminToken = await idToken(apiKey, adminEmail, adminPassword);
  const suspensionResponse = await fetch(
    "https://africa-south1-spacemansystemsbackend.cloudfunctions.net/upsertStore",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          storeId: adminStoreId,
          merchantId: merchantUid,
          name: adminStoreName,
          category: "Restaurant",
          description: "Minimal Playwright store fixture.",
          status: "suspended",
          deliveryZoneIds: ["zone-development"],
          address: {
            label: adminStoreName,
            formattedAddress: "Mabopane, South Africa",
            coordinates: { latitude: -25.5407, longitude: 28.1007 },
          },
          openingHours: [],
          openForOrders: false,
          minimumOrder: { amountMinor: 0, currency: "ZAR" },
        },
      }),
    },
  );
  const suspensionBody = await suspensionResponse.text();
  expect(suspensionResponse.ok, suspensionBody).toBe(true);
});

test("Phase 3 final Customer Web hidden-parent visibility checks", async ({ page }) => {
  requireFixtureEnvironment();
  await page.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  const market = page.getByRole("region", { name: "Active marketplace" });
  await expect(page.getByText("Catalog cached and current", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh catalog" }),
  ).toBeVisible();

  await loadAllStorePages(market);
  await page.getByLabel("Search stores").fill(adminStoreName);
  await expect(market.getByRole("heading", { name: adminStoreName })).toHaveCount(0);
  await expect(page.getByText("No active approved stores match this search.", { exact: true })).toBeVisible();
  await page.getByLabel("Search stores").fill("Playwright Hidden Kitchen");
  await expect(market.getByRole("heading", { name: "Playwright Hidden Kitchen" })).toHaveCount(0);
  await evidence(market, "playwright-customer-final-visibility.png");
});
