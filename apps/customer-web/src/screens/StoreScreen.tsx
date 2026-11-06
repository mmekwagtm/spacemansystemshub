import { formatMoney } from "@spaceman/app-core";
import type { Item, Store } from "@spaceman/app-types";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SwitchNote, useAddToCart } from "../cartActions";
import { useActiveStore, useStoreMenu } from "../catalog";
import { useCart, useCustomer } from "../context";
import { PhoneIcon, PlusIcon, RouteIcon } from "../icons";
import {
  directionsUrl,
  fromPrice,
  isOpenNow,
  localPhone,
  menuSections,
  orderChannelOf,
  todaysHours,
} from "../domain/store";
import {
  FloatingCart,
  Photo,
  StoreFacts,
  storeImage,
  storeTone,
  TopBar,
} from "../ui";

export function NotFound({
  what,
  back = "/",
}: {
  what: string;
  back?: string;
}) {
  return (
    <>
      <TopBar back={back} title="Not found" />
      <p className="empty" style={{ marginTop: 24 }}>
        This {what} isn’t available. It may have stopped taking orders.{" "}
        <Link className="linkBtn" to="/">
          Browse restaurants
        </Link>
      </p>
    </>
  );
}

function itemImage(item: Item): string | undefined {
  return item.media?.thumbnailUrl ?? item.media?.sourceUrl ?? item.imageUrl;
}

function DishCard({
  store,
  item,
  quantity,
  canOrder,
  onAdd,
}: {
  store: Store;
  item: Item;
  quantity: number;
  canOrder: boolean;
  onAdd(): void;
}) {
  const href = `/r/${encodeURIComponent(store.id)}/i/${encodeURIComponent(item.id)}`;
  return (
    <li className={item.available ? "fcard" : "fcard unavailable"}>
      <Link
        aria-label={`${item.name} details`}
        className="fcard-link"
        to={href}
      >
        <Photo
          alt={item.imageAlt || item.name}
          src={itemImage(item)}
          tone={storeTone(store)}
        />
        <span className="fname">{item.name}</span>
        <span className="fsub">{item.description || store.name}</span>
      </Link>
      <div className="frow">
        <span className="fprice">{formatMoney(item.price.amountMinor)}</span>
        {!item.available ? (
          <span className="small">Unavailable</span>
        ) : canOrder ? (
          <button
            aria-label={
              quantity
                ? `Add another ${item.name}, ${quantity} in cart`
                : `Add ${item.name}`
            }
            className={quantity ? "plus in" : "plus"}
            type="button"
            onClick={onAdd}
          >
            {quantity ? <span>{quantity}</span> : <PlusIcon />}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function StoreScreen() {
  const { storeId } = useParams();
  const { marketplace } = useCustomer();
  const { store, loading, error, retry } = useActiveStore(marketplace, storeId);
  const menu = useStoreMenu(marketplace, store?.id);
  const cart = useCart();
  const actions = useAddToCart(store);
  const [section, setSection] = useState<string>();

  if (!store) {
    if (loading)
      return (
        <p className="empty" role="status">
          Loading restaurant…
        </p>
      );
    if (error)
      return (
        <>
          <TopBar back="/" title="Restaurant" />
          <p className="empty" role="alert" style={{ marginTop: 24 }}>
            This restaurant can’t be loaded right now.{" "}
            <button className="linkBtn" type="button" onClick={retry}>
              Try again
            </button>
          </p>
        </>
      );
    return <NotFound what="restaurant" />;
  }

  const sections = menuSections(menu.items);
  const active = sections.find(([label]) => label === section) ?? sections[0];
  const open = isOpenNow(store);
  const today = todaysHours(store.openingHours);
  const whatsapp = orderChannelOf(store) === "whatsapp";
  const quantityOf = (itemId: string) =>
    cart.state.store?.id === store.id
      ? (cart.state.lines.find((line) => line.itemId === itemId)?.quantity ?? 0)
      : 0;

  return (
    <>
      <TopBar back="/" title="Restaurant" />
      <Photo
        alt={store.heroMedia?.altText ?? store.cardMedia?.altText ?? store.name}
        className="hero"
        src={storeImage(store, true)}
        tone={storeTone(store)}
      >
        <span className="ribbon">
          <span className="o">Verified kitchen</span>
        </span>
      </Photo>
      <h1 className="h1">{store.name}</h1>
      <p className="desc">
        {store.description ||
          `${store.category} in ${store.address.formattedAddress}.`}
      </p>
      <StoreFacts full fromMinor={fromPrice(menu.items)} store={store} />
      <div className="actions">
        {store.whatsappE164 ? (
          <a className="obtn" href={`tel:${store.whatsappE164}`}>
            <PhoneIcon />
            Call {localPhone(store.whatsappE164)}
          </a>
        ) : null}
        <a
          className="obtn"
          href={directionsUrl(store)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <RouteIcon />
          Directions
        </a>
      </div>

      {!store.openForOrders ? (
        <div className="note">
          {store.name} isn’t taking orders right now. You can still browse the
          menu.
        </div>
      ) : !open ? (
        <div className="note">
          Closed right now.
          {whatsapp
            ? ` You can still send your order; they’ll read it when they open${today ? ` at ${today.opensAt}` : ""}.`
            : " Checkout opens again during opening hours."}
        </div>
      ) : null}

      {actions.pending ? (
        <SwitchNote
          pendingStoreName={actions.pending.currentStoreName}
          storeName={store.name}
          onKeep={actions.keep}
          onReplace={actions.replace}
        />
      ) : null}
      {actions.message ? (
        <div className="note" role="status">
          {actions.message}
        </div>
      ) : null}

      {menu.loading ? (
        <p className="empty" role="status">
          Loading menu…
        </p>
      ) : menu.error && !menu.items.length ? (
        <p className="empty" role="alert">
          The menu can’t be loaded right now.{" "}
          <button className="linkBtn" type="button" onClick={menu.retry}>
            Try again
          </button>
        </p>
      ) : !active ? (
        <p className="empty">The menu is being updated. Check back soon.</p>
      ) : (
        <>
          <div aria-label="Menu sections" className="tags scroll" role="group">
            {sections.map(([label]) => (
              <button
                aria-pressed={label === active[0]}
                className="tag"
                key={label}
                type="button"
                onClick={() => setSection(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <h2 className="grpTitle">
            {active[0]} ({active[1].length})
          </h2>
          <ul className="fgrid">
            {active[1].map((item) => (
              <DishCard
                canOrder={actions.canOrder}
                item={item}
                key={item.id}
                quantity={quantityOf(item.id)}
                store={store}
                onAdd={() => void actions.add(item)}
              />
            ))}
          </ul>
        </>
      )}
      <FloatingCart />
    </>
  );
}
