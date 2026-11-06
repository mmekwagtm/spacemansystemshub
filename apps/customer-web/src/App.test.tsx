import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import type {
  CustomerIdentityService,
  MarketplaceService,
} from "@spaceman/app-services";
import { createCartStore } from "@spaceman/app-state";
import type { IdentitySession, Item, Store } from "@spaceman/app-types";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const metadata = {
  createdAt: "2026-11-01T00:00:00.000Z",
  createdBy: "admin-1",
  updatedAt: "2026-11-01T00:00:00.000Z",
  updatedBy: "admin-1",
};
const allDay = Array.from({ length: 7 }, (_, day) => ({
  day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  closed: false,
  opensAt: "00:00",
  closesAt: "23:59",
}));

const phalas: Store = {
  ...metadata,
  id: "phalas",
  merchantId: "merchant-1",
  name: "Phala's Eating House",
  searchName: "phalas eating house",
  category: "African food",
  description: "Traditional South African food from Mabopane Unit S.",
  status: "active",
  approvalState: "approved",
  source: "manual",
  deliveryZoneIds: ["zone-mabopane"],
  address: {
    label: "Kitchen",
    formattedAddress: "6233 Block S, Mabopane Unit S",
    coordinates: { latitude: -25.4987, longitude: 28.0934 },
    locality: "Mabopane",
  },
  openingHours: allDay,
  openForOrders: true,
  minimumOrder: { amountMinor: 0, currency: "ZAR" },
  orderChannel: "whatsapp",
  whatsappE164: "+27723329351",
  whatsappDeliveryAreas: [
    { name: "Mabopane", fee: { amountMinor: 4_000, currency: "ZAR" } },
    { name: "Soshanguve", fee: { amountMinor: 5_000, currency: "ZAR" } },
  ],
};
const kotaPlace: Store = {
  ...phalas,
  id: "kota",
  name: "Kota Corner",
  searchName: "kota corner",
  category: "Kota",
  orderChannel: "paystack",
  whatsappDeliveryAreas: [],
};

function dish(
  id: string,
  name: string,
  category: string,
  cents: number,
  store = phalas,
  available = true,
): Item {
  return {
    ...metadata,
    id,
    storeId: store.id,
    name,
    searchName: name.toLowerCase(),
    status: "active",
    available,
    price: { amountMinor: cents, currency: "ZAR" },
    categoryLabel: category,
    sortOrder: 1,
    source: "manual",
    imageAlt: name,
  };
}

const menus: Record<string, Item[]> = {
  phalas: [
    dish("mogodu", "Mala Mogodu", "Specialties", 6_000),
    dish("hardbody", "Chicken Hardbody", "Specialties", 6_000),
    dish("eisbein", "Eisbein", "Main meals", 15_000),
    dish("oxtail", "Ox Tail", "Main meals", 15_000, phalas, false),
  ],
  kota: [dish("kota-1", "Full House Kota", "Kota", 4_500, kotaPlace)],
};

function marketplace(
  stores: Store[] = [phalas, kotaPlace],
): MarketplaceService {
  return {
    listActiveStores: vi.fn(async () => ({ records: stores })),
    listActiveItems: vi.fn(async (storeId: string) => ({
      records: menus[storeId] ?? [],
    })),
  } as unknown as MarketplaceService;
}

function identity(
  session: IdentitySession | null = null,
  overrides: Partial<CustomerIdentityService> = {},
): CustomerIdentityService {
  return {
    subscribe(listener) {
      listener(session);
      return () => undefined;
    },
    signIn: vi.fn(async () => null),
    registerCustomer: vi.fn(async () => null),
    signOut: vi.fn(async () => undefined),
    resendVerification: vi.fn(async () => undefined),
    sendStaffSetupLink: vi.fn(async () => undefined),
    syncClaims: vi.fn(async () => null),
    googleSignInAvailable: true,
    signInWithGoogle: vi.fn(async () => null),
    completeCustomerProfile: vi.fn(async () => null),
    ...overrides,
  };
}

function memoryCart() {
  const data = new Map<string, string>();
  return createCartStore({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    },
  });
}

function renderApp(
  options: {
    path?: string;
    identityService?: CustomerIdentityService;
    marketplaceService?: MarketplaceService;
    cartStore?: ReturnType<typeof memoryCart>;
  } = {},
) {
  const cartStore = options.cartStore ?? memoryCart();
  render(
    <QueryClientProvider
      client={createSpacemanQueryClient({ queryRetry: false })}
    >
      <MemoryRouter initialEntries={[options.path ?? "/"]}>
        <App
          cartStore={cartStore}
          identityService={options.identityService ?? identity()}
          marketplaceService={options.marketplaceService ?? marketplace()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { cartStore };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Spaceman customer web", () => {
  it("lists consenting kitchens and filters by category and search", async () => {
    renderApp();
    expect(
      await screen.findByRole("heading", { name: /Ready to order\?/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Phala's Eating House")).toBeInTheDocument();
    expect(screen.getByText("Kota Corner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Restaurants (2)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Kota$/ }));
    expect(
      screen.getByRole("heading", { name: "Restaurants (1)" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Phala's Eating House")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear filters/ }));
    fireEvent.change(screen.getByPlaceholderText("Search restaurants"), {
      target: { value: "phala" },
    });
    expect(screen.queryByText("Kota Corner")).not.toBeInTheDocument();
    expect(screen.getByText("Phala's Eating House")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Restaurants (1)" }),
    ).toBeInTheDocument();
  });

  it("keeps loaded restaurants visible when a refresh fails", async () => {
    const service = {
      listActiveStores: vi
        .fn()
        .mockResolvedValueOnce({ records: [phalas] })
        .mockRejectedValue(new Error("offline")),
      listActiveItems: vi.fn(async () => ({ records: [] })),
    } as unknown as MarketplaceService;
    const client = createSpacemanQueryClient({ queryRetry: false });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <App identityService={identity()} marketplaceService={service} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Phala's Eating House")).toBeInTheDocument();
    await client.refetchQueries();
    expect(
      await screen.findByText(/Couldn’t refresh restaurants/),
    ).toBeInTheDocument();
    expect(screen.getByText("Phala's Eating House")).toBeInTheDocument();
  });

  it("builds a WhatsApp order from the real menu", async () => {
    renderApp({ path: "/r/phalas" });
    expect(
      await screen.findByRole("heading", {
        name: "Phala's Eating House",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Mala Mogodu")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Call 072 332 9351/ }),
    ).toHaveAttribute("href", "tel:+27723329351");

    fireEvent.click(screen.getByRole("button", { name: "Add Mala Mogodu" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Add another Mala Mogodu/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Main meals" }));
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Eisbein" }));

    fireEvent.click(
      screen.getByRole("link", { name: /3 items · Phala's Eating House/ }),
    );
    expect(
      await screen.findByRole("button", { name: /Place order on WhatsApp/ }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Place order on WhatsApp/ }),
    );
    expect(screen.getByText(/Add your name/)).toBeInTheDocument();
    expect(screen.getByText(/Add a street, unit or block/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Delivery area"), {
      target: { value: "Soshanguve" },
    });
    fireEvent.change(screen.getByLabelText("Delivery address"), {
      target: { value: "1234 Block S" },
    });
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Thabo" },
    });
    fireEvent.change(screen.getByLabelText("Note for the kitchen"), {
      target: { value: "Extra chakalaka" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Place order on WhatsApp/ }),
    );

    expect(
      await screen.findByRole("heading", { name: "Order ready to send" }),
    ).toBeInTheDocument();
    const message = document.getElementById("msgText")?.textContent ?? "";
    expect(message).toMatch(/2 x Mala Mogodu – R\s?120,00/);
    expect(message).toMatch(/1 x Eisbein – R\s?150,00/);
    expect(message).toMatch(/Delivery to Soshanguve: R\s?50,00/);
    expect(message).toMatch(/Total: R\s?320,00/);
    expect(message).toContain("Name: Thabo");
    const link = screen.getByRole("link", { name: /Open WhatsApp/ });
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/wa\.me\/27723329351\?text=/,
    );
  });

  it("asks before replacing another restaurant's order", async () => {
    const cartStore = memoryCart();
    await cartStore.hydrate();
    cartStore.getState().addItem({
      store: { id: kotaPlace.id, name: kotaPlace.name },
      item: {
        itemId: "kota-1",
        storeId: kotaPlace.id,
        name: "Full House Kota",
        unitPrice: { amountMinor: 4_500, currency: "ZAR" },
        available: true,
      },
    });
    renderApp({ path: "/r/phalas", cartStore });
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Mala Mogodu" }),
    );
    const prompt = screen.getByRole("alertdialog", {
      name: "Start a new order?",
    });
    expect(
      within(prompt).getByText(/You already have an order from Kota Corner/),
    ).toBeInTheDocument();

    fireEvent.click(
      within(prompt).getByRole("button", { name: "Keep my order" }),
    );
    expect(cartStore.getState().store?.id).toBe("kota");

    fireEvent.click(screen.getByRole("button", { name: "Add Mala Mogodu" }));
    fireEvent.click(screen.getByRole("button", { name: "Start new order" }));
    expect(cartStore.getState().store?.id).toBe("phalas");
    expect(cartStore.getState().lines).toHaveLength(1);
  });

  it("adds a chosen quantity from the dish screen", async () => {
    const { cartStore } = renderApp({ path: "/r/phalas/i/eisbein" });
    expect(
      await screen.findByRole("heading", { name: "Eisbein" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await waitFor(() =>
      expect(cartStore.getState().lines[0]?.quantity).toBe(2),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Phala's Eating House",
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("offers Google and email sign-in to guests", async () => {
    const signInWithGoogle = vi.fn(async () => null);
    const signIn = vi.fn(async () => null);
    renderApp({
      path: "/account",
      identityService: identity(null, { signInWithGoogle, signIn }),
    });

    expect(
      await screen.findByRole("heading", { name: "Log In" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Google/ }),
    );
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(
      screen.getByRole("heading", { name: "Sign Up" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "thabo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("thabo@example.com", "long-password"),
    );
  });

  it("lets a signed-in account without a profile finish sign-up", async () => {
    const completeCustomerProfile = vi.fn(async () => null);
    renderApp({
      path: "/account",
      identityService: identity(
        {
          uid: "uid-1",
          email: "thabo@gmail.com",
          emailVerified: true,
          claims: null,
          profile: null,
        },
        { completeCustomerProfile },
      ),
    });
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Thabo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    await waitFor(() =>
      expect(completeCustomerProfile).toHaveBeenCalledWith({
        displayName: "Thabo",
      }),
    );
  });

  it("saves an exact location pin for the order", async () => {
    renderApp({ path: "/location" });
    fireEvent.change(
      await screen.findByLabelText("Google Maps link or coordinates"),
      {
        target: { value: "-25.4987, 28.0934" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Use this location" }));
    expect(await screen.findByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("-25.49870, 28.09340")).toBeInTheDocument();
    expect(window.localStorage.getItem("spaceman.customer.pin.v1")).toContain(
      "-25.4987",
    );
  });
});
