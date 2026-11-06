import { expect, test } from "@playwright/test";

test("admin web exposes invitation-only identity and marketplace boundary", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Admin sign in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send secure setup link" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Marketplace operations" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("phase3-admin-sign-in.png"),
    fullPage: true,
  });
});

test("merchant web exposes invitation-only identity and scoped catalog boundary", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:4174", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Merchant sign in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send secure setup link" }),
  ).toBeVisible();
  await expect(page.getByText(/restricted to the stores/i)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("phase3-merchant-sign-in.png"),
    fullPage: true,
  });
});

test("customer web keeps active-catalog browse public and guards checkout", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Ready to order\?/ }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Search restaurants")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Restaurants \(\d+\)$/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Log in or sign up" }).click();
  await expect(
    page.getByRole("heading", { name: "Log In", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign Up", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("phase3-customer-marketplace.png"),
    fullPage: true,
  });
});

test("customer marketplace remains usable on a phone viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Ready to order\?/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Your order, \d+ items?/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("phase3-customer-mobile.png"),
    fullPage: true,
  });
});
