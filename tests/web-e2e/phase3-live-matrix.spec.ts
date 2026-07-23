import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();
const evidenceDir = path.join(
  root,
  "docs/live-test-data-docs/images/phase3-images",
);
const iconPath = path.join(
  root,
  "docs/architecture-visuals-docs/spaceman-icon.png",
);
const csvPath = path.join(root, "tests/fixtures/phase3-playwright-items.csv");

const adminEmail = process.env.PHASE3_ADMIN_EMAIL ?? "";
const adminPassword = process.env.PHASE3_ADMIN_PASSWORD ?? "";
const merchantEmail = process.env.PHASE3_MERCHANT_EMAIL ?? "";
const merchantPassword = process.env.PHASE3_MERCHANT_PASSWORD ?? "";
const customerEmail = process.env.PHASE3_CUSTOMER_EMAIL ?? "";
const customerPassword = process.env.PHASE3_CUSTOMER_PASSWORD ?? "";
const merchantUid = process.env.PHASE3_MERCHANT_UID ?? "";

const adminStoreName = "Playwright Admin Store 20260723";
const manualItemName = "Playwright Manual Item 20260723";
const unavailableItemName = "Playwright Unavailable Item 20260723";
const draftName = "Playwright Merchant Same Record Draft 20260723";
const correctedName = "Playwright Merchant Same Record Corrected 20260723";

function requireFixtureEnvironment() {
  for (const [name, value] of Object.entries({
    PHASE3_ADMIN_EMAIL: adminEmail,
    PHASE3_ADMIN_PASSWORD: adminPassword,
    PHASE3_MERCHANT_EMAIL: merchantEmail,
    PHASE3_MERCHANT_PASSWORD: merchantPassword,
    PHASE3_CUSTOMER_EMAIL: customerEmail,
    PHASE3_CUSTOMER_PASSWORD: customerPassword,
    PHASE3_MERCHANT_UID: merchantUid,
  })) {
    if (!value) throw new Error(`Missing ${name} for live Phase 3 checks.`);
  }
}

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  const form = page.locator("form").filter({ hasText: "Sign in" }).first();
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
}

async function saveEvidence(
  locator: import("@playwright/test").Locator,
  filename: string,
) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await locator.screenshot({ path: path.join(evidenceDir, filename) });
}

test("Phase 3 core marketplace web matrix", async ({ page, browser }) => {
  requireFixtureEnvironment();

  const admin = page;
  await admin.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
  await signIn(admin, adminEmail, adminPassword);
  await expect(
    admin.getByRole("heading", { name: "Marketplace operations" }),
  ).toBeVisible();

  const adminMarket = admin.getByRole("region", {
    name: "Marketplace operations",
  });
  await expect(
    adminMarket.getByRole("heading", { name: /API import/i }),
  ).toHaveCount(0);
  await expect(
    adminMarket.getByRole("button", { name: /API/i }),
  ).toHaveCount(0);

  const createStore = adminMarket
    .locator("form")
    .filter({ hasText: "Create or publish store" });
  await createStore.getByLabel("Merchant user ID").fill(merchantUid);
  await createStore.getByLabel("Store name").fill(adminStoreName);
  await createStore.getByLabel("Description").fill("Minimal Playwright store fixture.");
  await createStore.getByLabel("Address").fill("Mabopane, South Africa");
  await createStore.getByLabel("Delivery zone IDs").fill("zone-development");
  await createStore.getByLabel("Store card image").setInputFiles(iconPath);
  await createStore.getByLabel("Store image alt text").fill("Playwright store icon");
  await createStore.getByLabel("Status").selectOption("active");
  await createStore.getByRole("button", { name: "Save store" }).click();
  await expect(
    admin.getByText("Store saved through the trusted marketplace command.", {
      exact: true,
    }),
  ).toBeVisible();

  const itemForm = adminMarket
    .locator("form")
    .filter({ hasText: "Publish catalog item" });
  await itemForm.getByLabel("Item name").fill(manualItemName);
  await itemForm.getByLabel("Description").fill("Minimal media-backed item fixture.");
  await itemForm.getByLabel("Price (cents)").fill("9900");
  await itemForm.getByLabel("Image alt text").fill("Playwright item icon");
  await itemForm.getByLabel("Item image").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("not an image"),
  });
  await itemForm.getByRole("button", { name: "Publish item" }).click();
  await expect(admin.getByRole("alert")).toContainText(
    "Choose a JPEG, PNG, or WebP catalog image.",
  );
  await itemForm.getByLabel("Item image").setInputFiles(iconPath);
  await itemForm.getByRole("button", { name: "Publish item" }).click();
  await expect(admin.getByText("Catalog item published.", { exact: true })).toBeVisible();

  const otherStoreSelect = adminMarket.getByLabel("Target store");
  await otherStoreSelect.selectOption({ label: "Playwright Other Kitchen" });
  await itemForm.getByLabel("Item name").fill(unavailableItemName);
  await itemForm.getByLabel("Description").fill("Minimal unavailable item fixture.");
  await itemForm.getByLabel("Price (cents)").fill("1200");
  await itemForm.getByLabel("Image alt text").fill("Unavailable item icon");
  await itemForm.getByLabel("Item image").setInputFiles(iconPath);
  await itemForm.getByRole("button", { name: "Publish item" }).click();
  await expect(admin.getByText("Catalog item published.", { exact: true })).toBeVisible();

  await adminMarket.getByLabel("Target store").selectOption({ label: adminStoreName });
  const csvForm = adminMarket.locator("form").filter({ hasText: "CSV catalog import" });
  await csvForm.getByLabel("CSV preview").fill(fs.readFileSync(csvPath, "utf8"));
  await csvForm.getByRole("button", { name: "Stage CSV" }).click();
  await expect(adminMarket.getByRole("heading", { name: "Import preview" })).toBeVisible();
  for (const rowName of ["Playwright Juice", "Playwright Cookie"]) {
    await adminMarket
      .locator("label.check-row")
      .filter({ hasText: rowName })
      .locator("input")
      .uncheck();
  }
  await adminMarket.getByRole("button", { name: "Commit selected rows" }).click();
  await expect(
    admin.getByText("Selected import rows committed idempotently.", { exact: true }),
  ).toBeVisible();
  const managed = adminMarket.locator("section.subpanel").filter({ hasText: "Managed items" });
  await expect(managed.getByRole("heading", { name: "Playwright Burger" })).toBeVisible();
  await expect(managed.getByRole("heading", { name: "Playwright Juice" })).toHaveCount(0);
  await expect(managed.getByRole("heading", { name: "Playwright Cookie" })).toHaveCount(0);

  await csvForm.getByLabel("CSV preview").fill(fs.readFileSync(csvPath, "utf8"));
  await csvForm.getByRole("button", { name: "Stage CSV" }).click();
  await expect(adminMarket.getByRole("heading", { name: "Import preview" })).toBeVisible();
  for (const rowName of ["Playwright Juice", "Playwright Cookie"]) {
    await adminMarket
      .locator("label.check-row")
      .filter({ hasText: rowName })
      .locator("input")
      .uncheck();
  }
  await adminMarket.getByRole("button", { name: "Commit selected rows" }).click();
  await expect(
    admin.getByText("Selected import rows committed idempotently.", { exact: true }),
  ).toBeVisible();
  await expect(managed.getByRole("heading", { name: "Playwright Burger" })).toHaveCount(1);
  await expect(managed.getByRole("heading", { name: "Playwright Juice" })).toHaveCount(0);

  const googleForm = adminMarket
    .locator("form")
    .filter({ hasText: "Google Places store staging" });
  await googleForm.getByLabel("Search query").fill("KFC Mabopane");
  await googleForm.getByRole("button", { name: "Search places" }).click();
  await expect(admin.getByText("Place search completed.", { exact: true })).toBeVisible();
  const placeButton = googleForm.locator("button.secondary").filter({ hasText: " — " }).first();
  await expect(placeButton).toBeVisible();
  const placeLabel = (await placeButton.textContent())?.split(" — ")[0].trim() ?? "";
  admin.once("dialog", (dialog) => dialog.accept(merchantUid));
  await placeButton.click();
  await expect(admin.getByText("Google store staged for review.", { exact: true })).toBeVisible();
  await adminMarket.getByRole("button", { name: "Commit selected rows" }).click();
  await expect(
    admin.getByText("Selected import rows committed idempotently.", { exact: true }),
  ).toBeVisible();
  const googleCard = adminMarket
    .getByRole("article")
    .filter({ hasText: placeLabel })
    .first();
  await expect(googleCard).toBeVisible();
  const approveButton = googleCard.getByRole("button", { name: "Approve" });
  if (await approveButton.count()) {
    await approveButton.click();
    await expect(admin.getByText("Store approved; merchant scope refresh is required.", { exact: true })).toBeVisible();
  } else {
    await expect(googleCard.getByText("approved · active", { exact: true })).toBeVisible();
  }

  await saveEvidence(adminMarket, "playwright-admin-marketplace-matrix.png");

  const merchant = await browser.newPage();
  await merchant.goto("http://127.0.0.1:4174", { waitUntil: "domcontentloaded" });
  await signIn(merchant, merchantEmail, merchantPassword);
  await expect(
    merchant.getByRole("heading", { name: "Merchant operations foundation" }),
  ).toBeVisible();
  const merchantMarket = merchant.getByRole("region", {
    name: "Merchant marketplace",
  });
  const submitForm = merchantMarket.locator("form").filter({ hasText: "Submit draft store" });
  await submitForm.getByLabel("Name").fill(draftName);
  await submitForm.getByLabel("Description").fill("Draft for rejection and correction.");
  await submitForm.getByLabel("Address").fill("Mabopane, South Africa");
  await submitForm.getByRole("button", { name: "Submit for review" }).click();
  await expect(merchant.getByText("Draft submitted for administrator review.", { exact: true })).toBeVisible();

  await admin.reload({ waitUntil: "domcontentloaded" });
  await expect(admin.getByRole("heading", { name: "Marketplace operations" })).toBeVisible();
  const draftCard = adminMarket.getByRole("article").filter({ hasText: draftName });
  await expect(draftCard).toBeVisible();
  await draftCard.getByRole("button", { name: "Reject" }).click();
  await expect(admin.getByText("Store submission rejected.", { exact: true })).toBeVisible();

  await merchant.reload({ waitUntil: "domcontentloaded" });
  await expect(merchant.getByRole("heading", { name: "Merchant operations foundation" })).toBeVisible();
  const rejectedCard = merchantMarket
    .getByRole("article")
    .filter({ hasText: draftName })
    .first();
  await expect(
    rejectedCard.getByText("rejected · draft", { exact: true }),
  ).toBeVisible();
  await rejectedCard.getByRole("button", { name: "Select store" }).click();
  const correctionForm = merchantMarket
    .locator("form")
    .filter({ hasText: "Correct rejected store" });
  await correctionForm.getByLabel("Name").fill(correctedName);
  await correctionForm
    .getByLabel("Description")
    .fill("Corrected on the original rejected store record.");
  await correctionForm
    .getByRole("button", { name: "Resubmit corrected store" })
    .click();
  await expect(
    merchant.getByText(
      "Corrected store resubmitted for administrator review.",
      { exact: true },
    ),
  ).toBeVisible();

  await admin.reload({ waitUntil: "domcontentloaded" });
  await expect(
    adminMarket.getByRole("article").filter({ hasText: draftName }),
  ).toHaveCount(0);
  const correctedCard = adminMarket.getByRole("article").filter({ hasText: correctedName });
  await expect(correctedCard).toBeVisible();
  await correctedCard.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Store approved; merchant scope refresh is required.", { exact: true })).toBeVisible();

  await merchant.reload({ waitUntil: "domcontentloaded" });
  await expect(merchant.getByRole("heading", { name: "Merchant operations foundation" })).toBeVisible();
  const assignedCard = merchantMarket.getByRole("article").filter({ hasText: "Playwright Assigned Kitchen" });
  await assignedCard.getByRole("button", { name: "Select store" }).click();
  const updateForm = merchantMarket.locator("form").filter({ hasText: "Update assigned store" });
  await updateForm.getByLabel("Description").fill("Updated only through assigned merchant scope.");
  await updateForm.getByRole("button", { name: "Save store settings" }).click();
  await expect(merchant.getByText("Store presentation and operating state updated.", { exact: true })).toBeVisible();
  await expect(merchantMarket.getByText("Playwright Other Kitchen", { exact: true })).toHaveCount(0);

  const envText = fs.readFileSync(path.join(root, "apps/merchant-web/.env.local"), "utf8");
  const apiKey = envText.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!apiKey) throw new Error("Could not read the local Firebase API key for the scoped denial check.");
  const tokenResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: merchantEmail, password: merchantPassword, returnSecureToken: true }),
    },
  );
  const tokenBody = (await tokenResponse.json()) as { idToken?: string };
  if (!tokenBody.idToken) throw new Error("Merchant token could not be obtained for the denial check.");
  const deniedResponse = await fetch(
    "https://africa-south1-spacemansystemsbackend.cloudfunctions.net/updateMerchantStore",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenBody.idToken}`,
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
  await saveEvidence(merchantMarket, "playwright-merchant-scoped-matrix.png");

  const customer = await browser.newPage();
  await customer.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  const customerMarket = customer.getByRole("region", { name: "Active marketplace" });
  await expect(customerMarket.getByText("Catalog cached and current", { exact: true })).toBeVisible();
  await customer.getByLabel("Search stores").fill(adminStoreName);
  const publicAdminCard = customerMarket.getByRole("article").filter({ hasText: adminStoreName });
  await expect(publicAdminCard).toBeVisible();
  await publicAdminCard.getByRole("button", { name: "View menu" }).click();
  await expect(customerMarket.getByRole("heading", { name: manualItemName })).toBeVisible();
  await customer.getByRole("button", { name: "Continue to checkout" }).click();
  const customerSignIn = customer.locator("form").filter({ hasText: "Sign in" }).first();
  await customerSignIn.getByLabel("Email").fill(customerEmail);
  await customerSignIn.getByLabel("Password").fill(customerPassword);
  await customerSignIn.getByRole("button", { name: "Sign in" }).click();
  await expect(customer.getByRole("heading", { name: "Customer account ready" })).toBeVisible();
  await saveEvidence(customerMarket, "playwright-customer-authenticated-catalog.png");

  await admin.reload({ waitUntil: "domcontentloaded" });
  await adminMarket.getByLabel("Target store").selectOption({ label: adminStoreName });
  const finalManaged = adminMarket.locator("section.subpanel").filter({ hasText: "Managed items" });
  const burgerCard = finalManaged.getByRole("article").filter({ hasText: "Playwright Burger" });
  await burgerCard.getByRole("button", { name: "Retire item" }).click();
  await expect(admin.getByText("Item retired.", { exact: true })).toBeVisible();
  await expect(finalManaged.getByRole("heading", { name: "Playwright Burger" })).toHaveCount(0);
  await saveEvidence(adminMarket, "playwright-admin-retirement-evidence.png");
});

test("Phase 3 customer final visibility, unavailable, pagination, and error feedback", async ({ page }) => {
  requireFixtureEnvironment();
  await page.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  const market = page.getByRole("region", { name: "Active marketplace" });
  await expect(page.getByText("Catalog cached and current", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /next|previous|load more/i })).toHaveCount(0);
  await page.getByLabel("Search stores").fill("Playwright Other Kitchen");
  const otherCard = market.getByRole("article").filter({ hasText: "Playwright Other Kitchen" });
  await expect(otherCard).toBeVisible();
  await otherCard.getByRole("button", { name: "View menu" }).click();
  await expect(market.getByRole("heading", { name: unavailableItemName })).toBeVisible();
  await expect(market.getByText("Temporarily unavailable", { exact: true })).toBeVisible();

  await page.getByLabel("Search stores").fill(adminStoreName);
  await expect(market.getByRole("heading", { name: adminStoreName })).toHaveCount(0);
  await expect(page.getByText("No active approved stores match this search.", { exact: true })).toBeVisible();
  await page.getByLabel("Search stores").fill("Playwright Hidden Kitchen");
  await expect(page.getByRole("heading", { name: "Playwright Hidden Kitchen" })).toHaveCount(0);

  const errorPage = await page.context().newPage();
  await errorPage.route("**firestore.googleapis.com/**", (route) => route.abort());
  await errorPage.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  await expect(errorPage.getByRole("alert")).toContainText("catalog is temporarily unavailable", {
    timeout: 30_000,
  });
  await saveEvidence(market, "playwright-customer-final-visibility.png");
});
