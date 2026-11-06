import type { AddCartItemInput } from "@spaceman/app-state";
import type { Item, Store } from "@spaceman/app-types";
import { useState } from "react";

import { useCustomer } from "./context";

type Pending = { input: AddCartItemInput; currentStoreName: string };

/** Adds dishes to the one-store cart and asks before replacing another store's order. */
export function useAddToCart(store: Store | undefined) {
  const { cart } = useCustomer();
  const [pending, setPending] = useState<Pending>();
  const [message, setMessage] = useState("");

  function inputFor(
    item: Item,
    quantity: number,
  ): AddCartItemInput | undefined {
    if (!store) return undefined;
    return {
      store: { id: store.id, name: store.name },
      item: {
        itemId: item.id,
        storeId: item.storeId,
        name: item.name,
        unitPrice: item.price,
        available: item.available,
      },
      quantity,
    };
  }

  /** Returns true when the dish is now in the cart. */
  function add(item: Item, quantity = 1): boolean {
    const input = inputFor(item, quantity);
    if (!cart || !input) return false;
    setMessage("");
    const result = cart.getState().addItem(input);
    if (result.status === "added") return true;
    if (result.status === "store_conflict")
      setPending({ input, currentStoreName: result.currentStore.name });
    else if (result.status === "checkout_pending")
      setMessage(
        "Check your pending payment in the cart before changing this order.",
      );
    else setMessage("This dish isn’t available right now.");
    return false;
  }

  function replace(): boolean {
    if (!cart || !pending) return false;
    const result = cart.getState().replaceWithItem(pending.input);
    setPending(undefined);
    return result.status === "added";
  }

  return {
    add,
    replace,
    keep: () => setPending(undefined),
    pending,
    message,
    canOrder: Boolean(cart && store?.openForOrders),
  };
}

export function SwitchNote({
  storeName,
  pendingStoreName,
  onReplace,
  onKeep,
}: {
  storeName: string;
  pendingStoreName: string;
  onReplace(): void;
  onKeep(): void;
}) {
  return (
    <div className="note" role="alertdialog" aria-label="Start a new order?">
      <b>You already have an order from {pendingStoreName}.</b> Each order goes
      to one restaurant. Start a new order from {storeName}?
      <div className="actions">
        <button className="obtn strong" type="button" onClick={onReplace}>
          Start new order
        </button>
        <button className="obtn" type="button" onClick={onKeep}>
          Keep my order
        </button>
      </div>
    </div>
  );
}
