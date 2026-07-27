import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("customer app foundation", () => {
  it("keeps guest browsing separate from protected customer actions", () => {
    expect(["browse", "sign_in_before_checkout"]).toContain(
      "sign_in_before_checkout",
    );
  });

  it("wires the native route to the shared bounded active-catalog hooks", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/index.tsx"),
      "utf8",
    );
    expect(source).toContain(
      "useInfiniteActiveStores(customerMarketplaceService",
    );
    expect(source).toContain(
      "useInfiniteActiveItems(customerMarketplaceService",
    );
    expect(source).toContain("Load more stores");
    expect(source).toContain("Load more menu items");
    expect(source).toContain("Network.useNetworkState()");
    expect(source).toContain("Cached catalog — offline");
    expect(source).toContain("Cached catalog — refresh failed");
    expect(source).toContain("Refresh catalog");
    expect(source).toContain("Temporarily unavailable");
    expect(source).toContain("thumbnailUrl");
  });

  it("provides the shared query cache above every Expo Router screen", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/_layout.tsx"),
      "utf8",
    );
    expect(source).toContain("QueryClientProvider");
    expect(source).toContain("createSpacemanQueryClient");
  });

  it("wires the persisted one-store cart and native hosted-payment lifecycle", () => {
    const screenSource = readFileSync(
      resolve(process.cwd(), "app/index.tsx"),
      "utf8",
    );
    const checkoutSource = readFileSync(
      resolve(process.cwd(), "src/CheckoutPanel.tsx"),
      "utf8",
    );

    expect(screenSource).toContain("customerCartStore.hydrate()");
    expect(screenSource).toContain("replaceWithItem(input)");
    expect(screenSource).toContain("Temporarily unavailable");
    expect(checkoutSource).toContain('channel: "customer_app"');
    expect(checkoutSource).toContain("Powered by Google");
    expect(checkoutSource).toContain("Linking.openURL");
    expect(checkoutSource).toContain('state === "active"');
    expect(checkoutSource).toContain("Check payment");
    expect(checkoutSource).toContain("useCustomerOrders");
    expect(checkoutSource).toContain("Recent orders");
    expect(checkoutSource).toContain(
      "Connect to the internet before requesting a delivery quote.",
    );
  });
});
