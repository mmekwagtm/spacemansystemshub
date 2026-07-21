import { expect, test } from "@playwright/test";

test("admin web exposes invitation-only identity", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send secure setup link" })).toBeVisible();
});

test("merchant web exposes invitation-only identity", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Merchant sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send secure setup link" })).toBeVisible();
});

test("customer web keeps browse public and guards checkout", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Marketplace foundation" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create customer account" })).toBeVisible();
});
