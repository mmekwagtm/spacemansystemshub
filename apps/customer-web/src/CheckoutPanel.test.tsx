import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type { CheckoutService } from "@spaceman/app-services";
import { createCartStore, type CartStorage } from "@spaceman/app-state";
import type { CheckoutQuoteResult, Order } from "@spaceman/app-types";
import {
  act,
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
        deliveryZoneId: "zone-1",
        serviceAreaVersion: 1,
        distanceMetres: 2_400,
        durationSeconds: 720,
      },
      quoteExpiresAt: expiresAt,
    },
  } as CheckoutQuoteResult;
}

function service(expiresAt = "2099-07-26T12:00:00.000Z") {
  return {
    searchAddresses: vi.fn<CheckoutService["searchAddresses"]>(async () => [
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
  vi.useRealTimers();
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

  it("reuses a lost-response key and requires a fresh Places session after quote inputs change", async () => {
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
    expect(
      checkout.createSession.mock.calls[1]?.[0].addressSelection.sessionToken,
    ).toBe(checkout.searchAddresses.mock.calls[0]?.[0].sessionToken);

    fireEvent.change(screen.getByLabelText("Address label"), {
      target: { value: "Office" },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Review server quote" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(
      await screen.findByRole(
        "option",
        { name: /12 Block A/ },
        { timeout: 2_000 },
      ),
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
    expect(next?.addressSelection.label).toBe("Office");
    expect(next?.addressSelection.sessionToken.length).toBeLessThanOrEqual(36);
  });

  it("does not lock the cart when the Paystack popup is blocked and allows retry", async () => {
    const cart = await populatedCart();
    const checkout = service();
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
    await screen.findByRole("heading", { name: "Review server quote" });
    fireEvent.click(
      screen.getByRole("button", { name: "Pay securely with Paystack" }),
    );
    expect(
      await screen.findByText(/Allow pop-ups for this site/),
    ).toBeInTheDocument();
    expect(cart.getState().pendingCheckout).toBeUndefined();

    const replace = vi.fn();
    open.mockReturnValue({
      closed: false,
      close: vi.fn(),
      location: { replace },
      opener: window,
    } as unknown as Window);
    fireEvent.click(
      screen.getByRole("button", { name: "Pay securely with Paystack" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(cart.getState().pendingCheckout).toMatchObject({
      checkoutSessionId: "checkout-1",
      customerId: "customer-1",
    });
  });

  it.each([
    ["paid", "Payment verified. Order checkout-1 created.", false],
    ["processing", "Payment is still processing. Check again shortly.", true],
    ["failed", "Payment failed. No order was created.", false],
    ["cancelled", "Payment was cancelled. No order was created.", false],
    ["abandoned", "Payment was abandoned. No order was created.", false],
  ] as const)(
    "handles a manually checked %s payment outcome",
    async (status, expectedNotice, remainsPending) => {
      const cart = await populatedCart();
      cart.getState().setPendingCheckout({
        checkoutSessionId: "checkout-1",
        customerId: "customer-1",
        reference: "spc_checkout-1",
      });
      await cart.flushPersistence();
      const checkout = service();
      checkout.verifyPayment.mockResolvedValue({
        checkoutSessionId: "checkout-1",
        status,
        ...(status === "paid" ? { orderId: "checkout-1" } : {}),
      });
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

      fireEvent.click(
        await screen.findByRole("button", { name: "Check payment" }),
      );
      expect(await screen.findByText(expectedNotice)).toBeInTheDocument();
      expect(checkout.verifyPayment).toHaveBeenCalledWith({
        checkoutSessionId: "checkout-1",
      });
      expect(cart.getState().pendingCheckout !== undefined).toBe(
        remainsPending,
      );
    },
  );

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

  it("debounces address search and cancels the stale query", async () => {
    vi.useFakeTimers();
    const cart = await populatedCart();
    const checkout = service();
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

    const address = screen.getByLabelText(
      "Search a Mabopane delivery address",
    );
    fireEvent.change(address, { target: { value: "Mab" } });
    await act(() => vi.advanceTimersByTimeAsync(349));
    expect(checkout.searchAddresses).not.toHaveBeenCalled();
    fireEvent.change(address, { target: { value: "Mabopane" } });
    await act(() => vi.advanceTimersByTimeAsync(350));

    expect(checkout.searchAddresses).toHaveBeenCalledTimes(1);
    expect(checkout.searchAddresses).toHaveBeenCalledWith(
      expect.objectContaining({ query: "Mabopane" }),
    );
  });
});
