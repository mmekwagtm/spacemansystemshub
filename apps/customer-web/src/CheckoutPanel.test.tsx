import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { CheckoutService } from "@spaceman/app-services";
import { createCartStore, type CartStorage } from "@spaceman/app-state";
import type { CheckoutQuoteResult, Order } from "@spaceman/app-types";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckoutPanel } from "./CheckoutPanel";

function storage(): CartStorage {
  let value: string | null = null;
  return {
    getItem: () => value,
    removeItem: () => {
      value = null;
    },
    setItem: (_key, next) => {
      value = next;
    },
  };
}

async function populatedCart() {
  const cart = createCartStore({ storage: storage() });
  await cart.hydrate();
  cart.getState().addItem({
    store: { id: "store-1", name: "Mabopane Kitchen" },
    item: {
      itemId: "item-1",
      storeId: "store-1",
      name: "Meal",
      unitPrice: { amountMinor: 8_000, currency: "ZAR" },
      available: true,
    },
  });
  return cart;
}

function quote(expiresAt: string): CheckoutQuoteResult {
  return {
    checkoutSession: {
      id: "checkout-1",
      itemSubtotal: { amountMinor: 8_000, currency: "ZAR" },
      deliveryFee: { amountMinor: 2_000, currency: "ZAR" },
      total: { amountMinor: 10_000, currency: "ZAR" },
      routeSnapshot: {
        distanceMetres: 2_400,
        durationSeconds: 720,
      },
      quoteExpiresAt: expiresAt,
    },
  } as CheckoutQuoteResult;
}

function service(expiresAt = "2099-07-26T12:00:00.000Z") {
  return {
    searchAddresses: vi.fn(async () => [
      {
        placeId: "place-1",
        primaryText: "12 Block A",
        secondaryText: "Mabopane, South Africa",
        formattedText: "12 Block A, Mabopane, South Africa",
      },
    ]),
    createSession: vi.fn<CheckoutService["createSession"]>(async () =>
      quote(expiresAt),
    ),
    initializePayment: vi.fn(async () => ({
      checkoutSessionId: "checkout-1",
      reference: "spc_checkout_1",
      authorizationUrl: "https://checkout.paystack.com/token",
      quoteExpiresAt: expiresAt,
    })),
    verifyPayment: vi.fn<CheckoutService["verifyPayment"]>(async () => ({
      checkoutSessionId: "checkout-1",
      status: "paid" as const,
      orderId: "checkout-1",
    })),
    getSession: vi.fn(async () => null),
    getOrder: vi.fn(async () => null),
    listCustomerOrders: vi.fn<CheckoutService["listCustomerOrders"]>(
      async () => ({ records: [] }),
    ),
  } satisfies CheckoutService;
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

async function selectAddress() {
  fireEvent.change(
    screen.getByLabelText("Search a Mabopane delivery address"),
    { target: { value: "12 Block A" } },
  );
  fireEvent.click(
    await screen.findByRole(
      "option",
      { name: /12 Block A/ },
      { timeout: 2_000 },
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setOnline(true);
});

describe("Customer Web Phase 4 checkout", () => {
  it("preserves a guest cart and requests authentication", async () => {
    const cart = await populatedCart();
    const onRequireAccount = vi.fn();
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutPanel
          cartStore={cart}
          checkoutAllowed={false}
          onRequireAccount={onRequireAccount}
          service={service()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Your cart is saved/)).toBeInTheDocument();
    expect(cart.getState().lines).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to account" }),
    );
    expect(onRequireAccount).toHaveBeenCalledOnce();
    expect(cart.getState().lines).toHaveLength(1);
  });

  it("quotes, launches hosted Paystack, and reconciles on focus", async () => {
    setOnline(true);
    const cart = await populatedCart();
    const checkout = service();
    checkout.listCustomerOrders.mockImplementation(async () => ({
      records: checkout.verifyPayment.mock.calls.length
        ? [
            {
              id: "checkout-1",
              storeSnapshot: { name: "Mabopane Kitchen" },
              total: { amountMinor: 10_000, currency: "ZAR" },
              payment: { status: "paid" },
              fulfillment: { status: "paid" },
            } as Order,
          ]
        : [],
    }));
    const replace = vi.fn();
    const paymentWindow = {
      closed: false,
      close: vi.fn(),
      location: { replace },
      opener: window,
    } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(paymentWindow);
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutPanel
          cartStore={cart}
          checkoutAllowed
          customerId="customer-1"
          onRequireAccount={vi.fn()}
          service={checkout}
        />
      </QueryClientProvider>,
    );

    await selectAddress();
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate delivery quote" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Review server quote" }),
    ).toBeInTheDocument();
    expect(checkout.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "customer_web",
        storeId: "store-1",
        addressSelection: expect.objectContaining({ placeId: "place-1" }),
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Pay securely with Paystack" }),
    );
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("about:blank", "_blank"),
    );
    expect(replace).toHaveBeenCalledWith("https://checkout.paystack.com/token");
    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(checkout.verifyPayment).toHaveBeenCalled());
    await waitFor(() => expect(cart.getState().lines).toHaveLength(0));
    expect(await screen.findByText(/Payment verified/)).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Recent orders" }),
    ).toBeInTheDocument();
    const recentOrders = screen.getByLabelText("Recent paid orders");
    expect(recentOrders).toHaveTextContent("Mabopane Kitchen");
    expect(recentOrders).toHaveTextContent(/R\s*100,00/);
  });

  it("reuses a lost-response key, then rotates token and key after success", async () => {
    const cart = await populatedCart();
    const checkout = service();
    checkout.createSession
      .mockRejectedValueOnce(new Error("simulated lost response"))
      .mockResolvedValue(quote("2099-07-26T12:00:00.000Z"));
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutPanel
          cartStore={cart}
          checkoutAllowed
          customerId="customer-1"
          onRequireAccount={vi.fn()}
          service={checkout}
        />
      </QueryClientProvider>,
    );

    await selectAddress();
    const calculate = screen.getByRole("button", {
      name: "Calculate delivery quote",
    });
    fireEvent.click(calculate);
    await screen.findByRole("alert");
    fireEvent.click(calculate);
    await screen.findByRole("heading", { name: "Review server quote" });

    expect(checkout.createSession).toHaveBeenCalledTimes(2);
    expect(checkout.createSession.mock.calls[1]?.[0].idempotencyKey).toBe(
      checkout.createSession.mock.calls[0]?.[0].idempotencyKey,
    );
    fireEvent.click(calculate);
    await waitFor(() =>
      expect(checkout.createSession).toHaveBeenCalledTimes(3),
    );

    const replay = checkout.createSession.mock.calls[1]?.[0];
    const next = checkout.createSession.mock.calls[2]?.[0];
    expect(next?.idempotencyKey).not.toBe(replay?.idempotencyKey);
    expect(next?.addressSelection.sessionToken).not.toBe(
      replay?.addressSelection.sessionToken,
    );
    expect(next?.addressSelection.sessionToken.length).toBeLessThanOrEqual(36);
  });

  it("blocks offline address search and refuses an expired quote", async () => {
    const cart = await populatedCart();
    const checkout = service("2020-07-26T12:00:00.000Z");
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(
      <QueryClientProvider client={createSpacemanQueryClient()}>
        <CheckoutPanel
          cartStore={cart}
          checkoutAllowed
          customerId="customer-1"
          onRequireAccount={vi.fn()}
          service={checkout}
        />
      </QueryClientProvider>,
    );

    await selectAddress();
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate delivery quote" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Review server quote" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Pay securely with Paystack" }),
    );
    expect(
      await screen.findByText(
        "Your delivery quote expired. Request a new quote.",
      ),
    ).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();

    setOnline(false);
    fireEvent.change(
      screen.getByLabelText("Search a Mabopane delivery address"),
      { target: { value: "Block B" } },
    );
    expect(
      await screen.findByText(
        "Connect to the internet to search delivery addresses.",
      ),
    ).toBeInTheDocument();
  });
});
