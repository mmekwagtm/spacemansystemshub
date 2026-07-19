import { expect, test } from "@playwright/test";

test("customer web exposes the marketplace foundation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Marketplace foundation" })).toBeVisible();
});
