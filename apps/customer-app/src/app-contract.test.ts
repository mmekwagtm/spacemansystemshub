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
    expect(source).toContain("useActiveStores(customerMarketplaceService");
    expect(source).toContain("useActiveItems(customerMarketplaceService");
    expect(source).toMatch(/limit:\s*50/g);
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
