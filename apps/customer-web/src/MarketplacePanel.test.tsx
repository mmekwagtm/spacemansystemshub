import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { Item, Store } from "@spaceman/app-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarketplacePanel } from "./MarketplacePanel";

const metadata = {
  createdAt: "2026-07-21T00:00:00.000Z",
  createdBy: "admin-1",
  updatedAt: "2026-07-21T00:00:00.000Z",
  updatedBy: "admin-1",
};
const store: Store = {
  ...metadata,
  id: "store-1",
  merchantId: "merchant-1",
  name: "Development Kitchen",
  searchName: "development kitchen",
  category: "Restaurant",
  description: "A live-test catalog fixture.",
  status: "active",
  approvalState: "approved",
  source: "manual",
  deliveryZoneIds: ["zone-1"],
  address: {
    label: "Development Kitchen",
    formattedAddress: "Mabopane",
    coordinates: { latitude: -25.5407, longitude: 28.1007 },
  },
  openingHours: [],
  openForOrders: true,
  minimumOrder: { amountMinor: 5_000, currency: "ZAR" },
};
const item: Item = {
  ...metadata,
  id: "item-1",
  storeId: store.id,
  name: "Development Burger",
  searchName: "development burger",
  status: "active",
  available: false,
  price: { amountMinor: 8_500, currency: "ZAR" },
  categoryLabel: "Meals",
  sortOrder: 1,
  source: "manual",
  imageAlt: "Development burger",
};
const service = {
  listActiveStores: vi.fn(async () => ({ records: [store] })),
  listActiveItems: vi.fn(async () => ({ records: [item] })),
} as unknown as MarketplaceService;

describe("Customer marketplace", () => {
  it("shows the same active catalog to guests including unavailable states", async () => {
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel service={service} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Development Kitchen" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Development Burger")).toBeInTheDocument();
    expect(screen.getByText("Temporarily unavailable")).toBeInTheDocument();
  });
});
