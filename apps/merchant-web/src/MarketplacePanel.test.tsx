import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { Store } from "@spaceman/app-types";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarketplacePanel } from "./MarketplacePanel";

const service = {
  listMerchantStores: vi.fn(async () => ({ records: [] })),
  listPendingMerchantStores: vi.fn(async () => ({ records: [] })),
  listManagedItems: vi.fn(async () => ({ records: [] })),
} as unknown as MarketplaceService;

const rejectedStore: Store = {
  id: "rejected-store-1",
  merchantId: "merchant-1",
  name: "Rejected Kitchen",
  searchName: "rejected kitchen",
  category: "Restaurant",
  description: "Original submission.",
  status: "draft",
  approvalState: "rejected",
  source: "merchant",
  deliveryZoneIds: [],
  address: {
    label: "Rejected Kitchen",
    formattedAddress: "Mabopane, South Africa",
    coordinates: { latitude: -25.5407, longitude: 28.1007 },
  },
  openingHours: [],
  openForOrders: false,
  minimumOrder: { amountMinor: 0, currency: "ZAR" },
  rejectionReason: "Add a clearer description.",
  createdAt: "2026-07-23T00:00:00.000Z",
  createdBy: "merchant-1",
  updatedAt: "2026-07-23T00:00:00.000Z",
  updatedBy: "admin-1",
};

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

  it("corrects and resubmits a rejected store without creating a new record", async () => {
    const submitMerchantStore = vi.fn(async () => ({
      id: rejectedStore.id,
      acceptedAt: "2026-07-23T00:05:00.000Z",
    }));
    const rejectedService = {
      listPendingMerchantStores: vi.fn(async () => ({
        records: [rejectedStore],
      })),
      listMerchantStores: vi.fn(async () => ({ records: [] })),
      listManagedItems: vi.fn(async () => ({ records: [] })),
      submitMerchantStore,
    } as unknown as MarketplaceService;

    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel
          merchantId="merchant-1"
          ownerId="merchant-1"
          service={rejectedService}
          submissionOnly
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Add a clearer description.")).toBeVisible();
    const correctionForm = screen
      .getByRole("heading", { name: "Correct rejected store" })
      .closest("form");
    expect(correctionForm).not.toBeNull();
    const correction = within(correctionForm as HTMLFormElement);
    fireEvent.change(correction.getByRole("textbox", { name: "Description" }), {
      target: { value: "Corrected submission." },
    });
    fireEvent.click(
      correction.getByRole("button", { name: "Resubmit corrected store" }),
    );

    await waitFor(() =>
      expect(submitMerchantStore).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: rejectedStore.id,
          description: "Corrected submission.",
        }),
      ),
    );
    expect(
      await screen.findByText(
        "Corrected store resubmitted for administrator review.",
      ),
    ).toBeVisible();
  });
});
