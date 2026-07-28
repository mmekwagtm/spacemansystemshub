import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { CheckoutAdminService } from "@spaceman/app-services";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CheckoutSettingsPanel,
  parseRandAmountMinor,
} from "./CheckoutSettingsPanel";

function service(): CheckoutAdminService {
  return {
    getSettings: vi.fn(async () => ({
      id: "default" as const,
      maintenanceMode: false,
      customerOrderingEnabled: false,
      mapsQuoteEnabled: false,
      paystackEnabled: false,
      notificationDeliveryEnabled: false,
      createdAt: "2026-07-26T00:00:00.000Z",
      createdBy: "admin-1",
      updatedAt: "2026-07-26T00:00:00.000Z",
      updatedBy: "admin-1",
    })),
    listDeliveryZones: vi.fn(async () => ({ records: [] })),
    listFeeRules: vi.fn(async () => ({ records: [] })),
    upsertDeliveryZone: vi.fn(),
    publishDeliveryFeeRule: vi.fn(),
    updateSettings: vi.fn(),
  };
}

afterEach(cleanup);

describe("Phase 4 checkout configuration", () => {
  it("converts rand decimals to cents without floating-point rounding", () => {
    expect(parseRandAmountMinor("0.07", "fee")).toBe(7);
    expect(parseRandAmountMinor("20.01", "fee")).toBe(2_001);
    expect(parseRandAmountMinor("20.10", "fee")).toBe(2_010);
    expect(() => parseRandAmountMinor("20.001", "fee")).toThrow(
      "at most two decimal places",
    );
  });

  it("prefills the approved zone and fee values without auto-saving", async () => {
    const checkout = service();
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutSettingsPanel role="admin" service={checkout} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Maps, checkout, and payment controls",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Allowed ZA localities")).toHaveValue(
      "Mabopane",
    );
    expect(screen.getByLabelText("Base fee (rand)")).toHaveValue(20);
    expect(screen.getByLabelText("Included distance (metres)")).toHaveValue(
      3_000,
    );
    expect(screen.getByLabelText("Per kilometre (rand)")).toHaveValue(4);
    expect(screen.getByLabelText("Small-order threshold (rand)")).toHaveValue(
      100,
    );
    expect(screen.getByLabelText("Small-order surcharge (rand)")).toHaveValue(
      10,
    );
    expect(screen.getByLabelText("Minimum fee (rand)")).toHaveValue(20);
    expect(screen.getByLabelText("Maximum fee (rand)")).toHaveValue(80);
    expect(checkout.upsertDeliveryZone).not.toHaveBeenCalled();
    expect(checkout.publishDeliveryFeeRule).not.toHaveBeenCalled();
    expect(checkout.updateSettings).not.toHaveBeenCalled();
  });

  it("keeps enable flags disabled for a non-super administrator", async () => {
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutSettingsPanel role="admin" service={service()} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByLabelText("New Paystack payments"),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save enable flags" }),
    ).toBeDisabled();
  });
});
