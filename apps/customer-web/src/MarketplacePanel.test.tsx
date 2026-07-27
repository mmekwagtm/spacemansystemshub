import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { Item, Store } from "@spaceman/app-types";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
const secondStore: Store = {
  ...store,
  id: "store-2",
  name: "Second Kitchen",
  searchName: "second kitchen",
};
const service = {
  listActiveStores: vi.fn(async () => ({ records: [store] })),
  listActiveItems: vi.fn(async () => ({ records: [item] })),
} as unknown as MarketplaceService;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Customer marketplace", () => {
  it("shows the same active catalog to guests including unavailable states", async () => {
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel service={service} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        name: "Development Kitchen",
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Catalog cached and current"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Development Burger")).toBeInTheDocument();
    expect(screen.getByText("Temporarily unavailable")).toBeInTheDocument();
  });

  it("loads the next cursor page on demand", async () => {
    const pagedService = {
      listActiveStores: vi
        .fn()
        .mockResolvedValueOnce({
          records: [store],
          nextCursor: store.id,
        })
        .mockResolvedValueOnce({ records: [secondStore] }),
      listActiveItems: vi.fn(async () => ({ records: [item] })),
    } as unknown as MarketplaceService;

    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel service={pagedService} />
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Load more stores" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Second Kitchen" }),
    ).toBeInTheDocument();
    expect(pagedService.listActiveStores).toHaveBeenLastCalledWith({
      cursor: store.id,
      limit: 12,
    });
  });

  it("keeps cached results visible after a deterministic refresh failure", async () => {
    const failingService = {
      listActiveStores: vi
        .fn()
        .mockResolvedValueOnce({ records: [store] })
        .mockRejectedValue(new Error("offline")),
      listActiveItems: vi
        .fn()
        .mockResolvedValueOnce({ records: [item] })
        .mockRejectedValue(new Error("offline")),
    } as unknown as MarketplaceService;

    render(
      <QueryClientProvider
        client={createSpacemanQueryClient({ queryRetry: false })}
      >
        <MarketplacePanel service={failingService} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        name: "Development Kitchen",
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Catalog cached and current"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh catalog" }));
    await waitFor(
      () => expect(failingService.listActiveStores).toHaveBeenCalledTimes(2),
      { timeout: 10_000 },
    );
    expect(
      await screen.findByText(
        "Cached catalog — refresh failed",
        {},
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Development Kitchen",
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cached results remain visible when available/),
    ).toBeInTheDocument();
  });
});
