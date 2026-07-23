import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarketplacePanel } from "./MarketplacePanel";

const service = {
  listMerchantStores: vi.fn(async () => ({ records: [] })),
  listPendingMerchantStores: vi.fn(async () => ({ records: [] })),
  listManagedItems: vi.fn(async () => ({ records: [] })),
} as unknown as MarketplaceService;

describe("Merchant marketplace", () => {
  it("keeps pending onboarding limited to a draft submission", async () => {
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel
          merchantId="merchant-1"
          ownerId="merchant-1"
          service={service}
          submissionOnly
        />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Store submission" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save item" }),
    ).not.toBeInTheDocument();
  });
});
