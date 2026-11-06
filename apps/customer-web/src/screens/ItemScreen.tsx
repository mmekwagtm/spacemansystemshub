import { formatMoney } from "@spaceman/app-core";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { SwitchNote, useAddToCart } from "../cartActions";
import { useActiveStore, useStoreMenu } from "../catalog";
import { useCustomer } from "../context";
import { ClockIcon, MinusIcon, PlusIcon, TruckIcon } from "../icons";
import { deliverySummary, hoursLabel } from "../domain/store";
import { Photo, storeTone, TopBar } from "../ui";
import { NotFound } from "./StoreScreen";

export function ItemScreen() {
  const { storeId, itemId } = useParams();
  const navigate = useNavigate();
  const { marketplace } = useCustomer();
  const { store, loading } = useActiveStore(marketplace, storeId);
  const menu = useStoreMenu(marketplace, store?.id);
  const actions = useAddToCart(store);
  const [quantity, setQuantity] = useState(1);
  const storePath = `/r/${encodeURIComponent(storeId ?? "")}`;

  if (!store || menu.loading) {
    if (loading || menu.loading)
      return (
        <p className="empty" role="status">
          Loading dish…
        </p>
      );
    return <NotFound what="restaurant" />;
  }
  const item = menu.items.find((entry) => entry.id === itemId);
  if (!item) return <NotFound back={storePath} what="dish" />;

  const total = item.price.amountMinor * quantity;
  const image =
    item.media?.sourceUrl ?? item.media?.thumbnailUrl ?? item.imageUrl;

  return (
    <div className="foodv">
      <TopBar back={storePath} cart={false} title="Details" />
      <Photo
        alt={item.imageAlt || item.name}
        className="hero big"
        src={image}
        tone={storeTone(store)}
      />
      <div className="chipR">
        <i aria-hidden="true" />
        {store.name}
      </div>
      <h1 className="h1">{item.name}</h1>
      <p className="desc">
        {item.description || `${item.categoryLabel} from ${store.name}.`}
      </p>
      <div className="facts">
        <span>
          <TruckIcon />
          {deliverySummary(store, true)}
        </span>
        <span>
          <ClockIcon />
          {hoursLabel(store.openingHours)}
        </span>
      </div>
      {!item.available ? (
        <div className="note">This dish isn’t available right now.</div>
      ) : null}
      {actions.pending ? (
        <SwitchNote
          pendingStoreName={actions.pending.currentStoreName}
          storeName={store.name}
          onKeep={actions.keep}
          onReplace={() => {
            if (actions.replace()) navigate(storePath);
          }}
        />
      ) : null}
      {actions.message ? (
        <div className="note" role="status">
          {actions.message}
        </div>
      ) : null}

      <div className="bottom">
        <div className="in">
          <div className="priceRow">
            <span className="bigprice" aria-live="polite">
              {formatMoney(total)}
            </span>
            <span className="qty">
              <button
                aria-label="One less"
                disabled={quantity <= 1}
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <MinusIcon />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                aria-label="One more"
                disabled={quantity >= 20}
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
              >
                <PlusIcon />
              </button>
            </span>
          </div>
          <button
            className="cta"
            disabled={!actions.canOrder || !item.available}
            type="button"
            onClick={() => {
              if (actions.add(item, quantity)) navigate(storePath);
            }}
          >
            {actions.canOrder ? "Add to cart" : "Not taking orders"}
          </button>
        </div>
      </div>
    </div>
  );
}
