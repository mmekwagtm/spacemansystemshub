import { describe, expect, it, vi } from "vitest";

import {
  CART_SCHEMA_VERSION,
  createCartStore,
  type CartStorage,
} from "./index";

function memoryStorage(seed?: string): CartStorage & { value: string | null } {
  return {
    value: seed ?? null,
    getItem() {
      return this.value;
    },
    removeItem() {
      this.value = null;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

const item = (storeId: string, itemId: string) => ({
  store: { id: storeId, name: `Store ${storeId}` },
  item: {
    itemId,
    storeId,
    name: `Item ${itemId}`,
    unitPrice: { amountMinor: 2_500, currency: "ZAR" as const },
    available: true,
  },
});

describe("versioned one-store cart", () => {
  it("persists and restores a cart", async () => {
    const storage = memoryStorage();
    const cart = createCartStore({ storage });
    expect(cart.getState().addItem(item("one", "first")).status).toBe("added");
    cart.getState().setPendingCheckout({
      checkoutSessionId: "checkout-1",
      customerId: "customer-1",
      reference: "spc_checkout-1",
    });
    await cart.flushPersistence();

    const restored = createCartStore({ storage });
    await restored.hydrate();
    expect(restored.getState().version).toBe(CART_SCHEMA_VERSION);
    expect(restored.getState().lines).toHaveLength(1);
    expect(restored.getState().store?.id).toBe("one");
    expect(restored.getState().pendingCheckout?.customerId).toBe("customer-1");
  });

  it("requires explicit replacement before crossing stores", () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.getState().addItem(item("one", "first"));
    const conflict = cart.getState().addItem(item("two", "second"));
    expect(conflict.status).toBe("store_conflict");
    expect(cart.getState().store?.id).toBe("one");

    cart.getState().replaceWithItem(item("two", "second"));
    expect(cart.getState().store?.id).toBe("two");
    expect(cart.getState().lines[0]?.itemId).toBe("second");
  });

  it("does not add unavailable items", () => {
    const cart = createCartStore({ storage: memoryStorage() });
    const input = item("one", "first");
    expect(
      cart.getState().addItem({
        ...input,
        item: { ...input.item, available: false },
      }).status,
    ).toBe("unavailable");
    expect(cart.getState().lines).toEqual([]);
  });

  it("locks cart mutations while a payment is pending", () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.getState().addItem(item("one", "first"));
    cart.getState().setPendingCheckout({
      checkoutSessionId: "checkout-1",
      customerId: "customer-1",
    });
    expect(cart.getState().addItem(item("one", "second")).status).toBe(
      "checkout_pending",
    );
    cart.getState().updateQuantity("first", 2);
    cart.getState().clear();
    expect(cart.getState().lines[0]?.quantity).toBe(1);
    expect(cart.getState().pendingCheckout?.checkoutSessionId).toBe(
      "checkout-1",
    );
    cart.getState().clear({ force: true });
    expect(cart.getState().lines).toEqual([]);
  });

  it("discards a corrupt persisted payload", async () => {
    const storage = memoryStorage('{"version":1,"lines":[{"bad":true}]}');
    const cart = createCartStore({ storage });
    await cart.hydrate();
    expect(cart.getState().hydrated).toBe(true);
    expect(cart.getState().lines).toEqual([]);
    expect(storage.value).toBeNull();
  });

  it("finishes hydration when reading storage rejects", async () => {
    const setItem = vi.fn();
    const cart = createCartStore({
      storage: {
        getItem: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        removeItem: vi.fn(),
        setItem,
      },
    });

    await expect(cart.hydrate()).resolves.toBeUndefined();
    expect(cart.getState().hydrated).toBe(true);
    expect(cart.getState().addItem(item("one", "first")).status).toBe("added");
    await cart.flushPersistence();
    expect(setItem).toHaveBeenCalledOnce();
  });

  it("finishes corrupt-payload cleanup when removal rejects", async () => {
    const cart = createCartStore({
      storage: {
        getItem: vi
          .fn()
          .mockResolvedValue('{"version":1,"lines":[{"bad":true}]}'),
        removeItem: vi.fn().mockRejectedValue(new Error("read only")),
        setItem: vi.fn(),
      },
    });

    await expect(cart.hydrate()).resolves.toBeUndefined();
    expect(cart.getState().hydrated).toBe(true);
    expect(cart.getState().lines).toEqual([]);
  });

  it("continues persisting after a failed write", async () => {
    const setItem = vi
      .fn()
      .mockRejectedValueOnce(new Error("quota exceeded"))
      .mockResolvedValue(undefined);
    const cart = createCartStore({
      storage: {
        getItem: vi.fn().mockResolvedValue(null),
        removeItem: vi.fn(),
        setItem,
      },
    });
    await cart.hydrate();

    cart.getState().addItem(item("one", "first"));
    await cart.flushPersistence();
    cart.getState().updateQuantity("first", 2);
    await cart.flushPersistence();

    expect(setItem).toHaveBeenCalledTimes(2);
    expect(setItem.mock.calls[1]?.[1]).toContain('"quantity":2');
  });
});
