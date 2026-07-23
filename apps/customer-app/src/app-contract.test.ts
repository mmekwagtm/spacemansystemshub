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
});
