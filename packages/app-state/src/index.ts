import type { Money } from "@spaceman/app-types";
import { createStore, type StoreApi } from "zustand/vanilla";

export interface AppUiState {
  selectedStoreId: string | undefined;
  selectedOrderId: string | undefined;
  mapPanelOpen: boolean;
  setSelectedStoreId(storeId?: string): void;
  setSelectedOrderId(orderId?: string): void;
  setMapPanelOpen(open: boolean): void;
}

export function createAppUiStore() {
  return createStore<AppUiState>()((set) => ({
    selectedStoreId: undefined,
    selectedOrderId: undefined,
    mapPanelOpen: false,
    setSelectedStoreId: (selectedStoreId) => set({ selectedStoreId }),
    setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId }),
    setMapPanelOpen: (mapPanelOpen) => set({ mapPanelOpen }),
  }));
}

export const CART_SCHEMA_VERSION = 1 as const;
export const DEFAULT_CART_STORAGE_KEY = "spaceman.customer.cart.v1";

export interface CartStorage {
  getItem(key: string): Promise<string | null> | string | null;
  removeItem(key: string): Promise<void> | void;
  setItem(key: string, value: string): Promise<void> | void;
}

export interface CartStoreSnapshot {
  id: string;
  name: string;
}

export interface CartLineSnapshot {
  itemId: string;
  storeId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
}

export interface PendingCheckoutSnapshot {
  checkoutSessionId: string;
  customerId?: string;
  reference?: string;
}

export interface AddCartItemInput {
  store: CartStoreSnapshot;
  item: Omit<CartLineSnapshot, "quantity"> & {
    available: boolean;
  };
  quantity?: number;
}

export type AddCartItemResult =
  | { status: "added" }
  | { status: "store_conflict"; currentStore: CartStoreSnapshot }
  | { status: "checkout_pending" }
  | { status: "unavailable" };

interface PersistedCart {
  version: typeof CART_SCHEMA_VERSION;
  store?: CartStoreSnapshot;
  lines: CartLineSnapshot[];
  pendingCheckout?: PendingCheckoutSnapshot;
}

export interface CartState {
  version: typeof CART_SCHEMA_VERSION;
  store: CartStoreSnapshot | undefined;
  lines: CartLineSnapshot[];
  pendingCheckout: PendingCheckoutSnapshot | undefined;
  hydrated: boolean;
  addItem(input: AddCartItemInput): AddCartItemResult;
  replaceWithItem(input: AddCartItemInput): AddCartItemResult;
  updateQuantity(itemId: string, quantity: number): void;
  removeItem(itemId: string): void;
  clear(options?: { force?: boolean }): void;
  setPendingCheckout(pending?: PendingCheckoutSnapshot): void;
}

export type CartStore = StoreApi<CartState> & {
  hydrate(): Promise<void>;
  flushPersistence(): Promise<void>;
};

function validMoney(value: unknown): value is Money {
  if (value === null || typeof value !== "object") return false;
  const money = value as Partial<Money>;
  return (
    money.currency === "ZAR" &&
    typeof money.amountMinor === "number" &&
    Number.isSafeInteger(money.amountMinor) &&
    money.amountMinor >= 0
  );
}

function parsePersistedCart(value: string): PersistedCart | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== CART_SCHEMA_VERSION || !Array.isArray(parsed.lines))
      return null;
    const lines: CartLineSnapshot[] = [];
    for (const entry of parsed.lines) {
      if (entry === null || typeof entry !== "object") return null;
      const line = entry as Partial<CartLineSnapshot>;
      if (
        typeof line.itemId !== "string" ||
        typeof line.storeId !== "string" ||
        typeof line.name !== "string" ||
        !validMoney(line.unitPrice) ||
        typeof line.quantity !== "number" ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 99
      )
        return null;
      lines.push({
        itemId: line.itemId,
        storeId: line.storeId,
        name: line.name,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      });
    }

    let store: CartStoreSnapshot | undefined;
    if (parsed.store !== undefined) {
      if (parsed.store === null || typeof parsed.store !== "object")
        return null;
      const candidate = parsed.store as Partial<CartStoreSnapshot>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.name !== "string"
      )
        return null;
      store = { id: candidate.id, name: candidate.name };
    }
    if (
      (lines.length > 0 && store === undefined) ||
      lines.some((line) => line.storeId !== store?.id)
    )
      return null;

    let pendingCheckout: PendingCheckoutSnapshot | undefined;
    if (parsed.pendingCheckout !== undefined) {
      if (
        parsed.pendingCheckout === null ||
        typeof parsed.pendingCheckout !== "object"
      )
        return null;
      const candidate =
        parsed.pendingCheckout as Partial<PendingCheckoutSnapshot>;
      if (typeof candidate.checkoutSessionId !== "string") return null;
      pendingCheckout = {
        checkoutSessionId: candidate.checkoutSessionId,
        ...(typeof candidate.customerId === "string"
          ? { customerId: candidate.customerId }
          : {}),
        ...(typeof candidate.reference === "string"
          ? { reference: candidate.reference }
          : {}),
      };
    }

    return {
      version: CART_SCHEMA_VERSION,
      lines,
      ...(store === undefined ? {} : { store }),
      ...(pendingCheckout === undefined ? {} : { pendingCheckout }),
    };
  } catch {
    return null;
  }
}

function quantityOrDefault(value: number | undefined): number {
  return Math.max(1, Math.min(99, value ?? 1));
}

export function createCartStore(options: {
  storage: CartStorage;
  storageKey?: string;
}): CartStore {
  const key = options.storageKey ?? DEFAULT_CART_STORAGE_KEY;
  let writeQueue = Promise.resolve();

  const persistedSnapshot = (): PersistedCart => {
    const state = store.getState();
    return {
      version: CART_SCHEMA_VERSION,
      lines: state.lines,
      ...(state.store === undefined ? {} : { store: state.store }),
      ...(state.pendingCheckout === undefined
        ? {}
        : { pendingCheckout: state.pendingCheckout }),
    };
  };
  const persist = (): void => {
    writeQueue = writeQueue.then(async () => {
      const snapshot = persistedSnapshot();
      if (
        snapshot.lines.length === 0 &&
        snapshot.pendingCheckout === undefined
      ) {
        await options.storage.removeItem(key);
        return;
      }
      await options.storage.setItem(key, JSON.stringify(snapshot));
    });
  };

  const store = createStore<CartState>()((set, get) => {
    const replace = (input: AddCartItemInput): AddCartItemResult => {
      if (!input.item.available) return { status: "unavailable" };
      if (get().pendingCheckout) return { status: "checkout_pending" };
      set({
        store: input.store,
        lines: [
          {
            itemId: input.item.itemId,
            storeId: input.item.storeId,
            name: input.item.name,
            unitPrice: input.item.unitPrice,
            quantity: quantityOrDefault(input.quantity),
          },
        ],
        pendingCheckout: undefined,
      });
      persist();
      return { status: "added" };
    };

    return {
      version: CART_SCHEMA_VERSION,
      store: undefined,
      lines: [],
      pendingCheckout: undefined,
      hydrated: false,
      addItem(input) {
        if (!input.item.available) return { status: "unavailable" };
        const current = get();
        if (current.pendingCheckout) return { status: "checkout_pending" };
        if (current.store && current.store.id !== input.store.id) {
          return { status: "store_conflict", currentStore: current.store };
        }
        const quantity = quantityOrDefault(input.quantity);
        const existing = current.lines.find(
          (line) => line.itemId === input.item.itemId,
        );
        const nextLine: CartLineSnapshot = {
          itemId: input.item.itemId,
          storeId: input.item.storeId,
          name: input.item.name,
          unitPrice: input.item.unitPrice,
          quantity: Math.min(99, (existing?.quantity ?? 0) + quantity),
        };
        set({
          store: input.store,
          lines: existing
            ? current.lines.map((line) =>
                line.itemId === nextLine.itemId ? nextLine : line,
              )
            : [...current.lines, nextLine],
          pendingCheckout: undefined,
        });
        persist();
        return { status: "added" };
      },
      replaceWithItem: replace,
      updateQuantity(itemId, quantity) {
        if (get().pendingCheckout) return;
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
          get().removeItem(itemId);
          return;
        }
        set((current) => ({
          lines: current.lines.map((line) =>
            line.itemId === itemId
              ? { ...line, quantity: Math.min(99, quantity) }
              : line,
          ),
          pendingCheckout: undefined,
        }));
        persist();
      },
      removeItem(itemId) {
        if (get().pendingCheckout) return;
        set((current) => {
          const lines = current.lines.filter((line) => line.itemId !== itemId);
          return {
            lines,
            store: lines.length === 0 ? undefined : current.store,
            pendingCheckout: undefined,
          };
        });
        persist();
      },
      clear(options) {
        if (get().pendingCheckout && options?.force !== true) return;
        set({ store: undefined, lines: [], pendingCheckout: undefined });
        persist();
      },
      setPendingCheckout(pending) {
        set({ pendingCheckout: pending });
        persist();
      },
    };
  });

  return Object.assign(store, {
    async hydrate() {
      const raw = await options.storage.getItem(key);
      if (raw === null) {
        store.setState({ hydrated: true });
        return;
      }
      const parsed = parsePersistedCart(raw);
      if (parsed === null) {
        await options.storage.removeItem(key);
        store.setState({
          hydrated: true,
          store: undefined,
          lines: [],
          pendingCheckout: undefined,
        });
        return;
      }
      store.setState({
        version: parsed.version,
        store: parsed.store,
        lines: parsed.lines,
        pendingCheckout: parsed.pendingCheckout,
        hydrated: true,
      });
    },
    async flushPersistence() {
      await writeQueue;
    },
  });
}
