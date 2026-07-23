import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { MarketplaceService } from "@spaceman/app-services";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarketplacePanel } from "./MarketplacePanel";

const service = {
  listAdminStores: vi.fn(async () => ({ records: [] })),
  listManagedItems: vi.fn(async () => ({ records: [] })),
  listImportRows: vi.fn(async () => ({ records: [] })),
} as unknown as MarketplaceService;

describe("Admin marketplace", () => {
  it("exposes trusted manual, Google, CSV, and API workflows", async () => {
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
    expect(screen.getByRole("button", { name: "Stage API" })).toBeDisabled();
  });
});
