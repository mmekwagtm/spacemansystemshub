import { expect, test } from "@playwright/test";

const webFoundations = [
  {
    name: "admin web",
    url: "http://127.0.0.1:4173",
    heading: "Operations foundation"
  },
  {
    name: "merchant web",
    url: "http://127.0.0.1:4174",
    heading: "Merchant operations foundation"
  },
  {
    name: "customer web",
    url: "http://127.0.0.1:4175",
    heading: "Marketplace foundation"
  }
] as const;

for (const app of webFoundations) {
  test(`${app.name} exposes its foundation`, async ({ page }) => {
    await page.goto(app.url, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: app.heading })).toBeVisible();
  });
}
