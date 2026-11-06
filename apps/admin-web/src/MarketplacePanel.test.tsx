import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import type { UpsertStoreInput } from "@spaceman/app-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketplacePanel } from "./MarketplacePanel";

const service = {
  listAdminStores: vi.fn(async () => ({ records: [] })),
  listManagedItems: vi.fn(async () => ({ records: [] })),
  listImportRows: vi.fn(async () => ({ records: [] })),
} as unknown as MarketplaceService;

afterEach(cleanup);

describe("Admin marketplace", () => {
  it("exposes trusted manual, Google, and CSV workflows", async () => {
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel ownerId="admin-1" service={service} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Marketplace operations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save store" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search places" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stage CSV" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Stage API" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a newly created store selectable outside the bounded admin page", async () => {
    const saveAdminStore = vi.fn(async (_input: UpsertStoreInput) => ({
      id: "store-new",
    }));
    const scopedService = {
      ...service,
      saveAdminStore,
    } as unknown as MarketplaceService;

    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel ownerId="admin-1" service={scopedService} />
      </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: "Marketplace operations" });

    fireEvent.change(screen.getByLabelText("Merchant user ID"), {
      target: { value: "merchant-1" },
    });
    fireEvent.change(screen.getByLabelText("Store name"), {
      target: { value: "New bounded-page store" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "Mabopane, South Africa" },
    });
    fireEvent.change(screen.getByLabelText("Delivery zone IDs"), {
      target: { value: "zone-development" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save store" }));

    expect(
      await screen.findByText(
        "Store saved through the trusted marketplace command.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Target store")).toHaveValue("store-new");
    expect(
      screen.getByRole("option", { name: "New bounded-page store" }),
    ).toBeInTheDocument();
    expect(saveAdminStore).toHaveBeenCalledOnce();
    expect(saveAdminStore.mock.calls[0]?.[0].openingHours).toHaveLength(7);
    expect(saveAdminStore.mock.calls[0]?.[0].orderChannel).toBe("paystack");
  });

  it("saves a WhatsApp-ordering store with its delivery areas", async () => {
    const saveAdminStore = vi.fn(async (_input: UpsertStoreInput) => ({
      id: "store-whatsapp",
    }));
    const scopedService = {
      ...service,
      saveAdminStore,
    } as unknown as MarketplaceService;

    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <MarketplacePanel ownerId="admin-1" service={scopedService} />
      </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: "Marketplace operations" });

    fireEvent.change(screen.getByLabelText("Merchant user ID"), {
      target: { value: "merchant-1" },
    });
    fireEvent.change(screen.getByLabelText("Store name"), {
      target: { value: "Phala's Eating House" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "6233 Block S, Mabopane Unit S" },
    });
    fireEvent.change(screen.getByLabelText("Delivery zone IDs"), {
      target: { value: "zone-mabopane" },
    });
    fireEvent.change(screen.getByLabelText("Order channel"), {
      target: { value: "whatsapp" },
    });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), {
      target: { value: "072 332 9351" },
    });
    fireEvent.change(
      screen.getByLabelText(
        "WhatsApp delivery areas (one per line, fee in rand)",
      ),
      { target: { value: "Mabopane = 40\nSoshanguve = 50" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save store" }));

    expect(
      await screen.findByText(
        "Store saved through the trusted marketplace command.",
      ),
    ).toBeInTheDocument();
    expect(saveAdminStore.mock.calls[0]?.[0]).toMatchObject({
      orderChannel: "whatsapp",
      whatsappE164: "+27723329351",
      whatsappDeliveryAreas: [
        { name: "Mabopane", fee: { amountMinor: 4_000, currency: "ZAR" } },
        { name: "Soshanguve", fee: { amountMinor: 5_000, currency: "ZAR" } },
      ],
    });
  });
});
