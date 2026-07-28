import { describe, expect, it, vi } from "vitest";

import { createJsonProviderGateway } from "./provider-gateway";

describe("JSON provider gateway", () => {
  it("returns parsed provider JSON through an injected transport", async () => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ status: true }), { status: 200 }),
      ),
    ) as unknown as typeof fetch;
    const gateway = createJsonProviderGateway(fetcher);

    await expect(gateway.request("https://provider.test", {}, "test")).resolves
      .toEqual({ status: true });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("maps provider throttling to a resource-exhausted callable error", async () => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(
        new Response("limited", { status: 429 }),
      ),
    ) as unknown as typeof fetch;
    const gateway = createJsonProviderGateway(fetcher);

    await expect(
      gateway.request("https://provider.test", {}, "test"),
    ).rejects.toMatchObject({ code: "resource-exhausted" });
  });
});
