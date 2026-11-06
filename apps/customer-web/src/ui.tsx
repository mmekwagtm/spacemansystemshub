import { formatMoney } from "@spaceman/app-core";
import type { Store } from "@spaceman/app-types";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "./context";
import {
  BackIcon,
  BagIcon,
  ClockIcon,
  SpacemanLogo,
  TagIcon,
  TruckIcon,
} from "./icons";
import {
  deliverySummary,
  hoursLabel,
  isOpenNow,
  toneFor,
} from "./domain/store";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <div className={footer ? "brand brand-footer" : "brand"}>
      <SpacemanLogo />
      <span className="wm">
        space
        <br />
        man.
      </span>
      <span className="tagline">
        On The
        <br />
        Move.
      </span>
    </div>
  );
}

export function BackButton({
  to,
  label = "Back",
}: {
  to?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      aria-label={label}
      className="circle"
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <BackIcon />
    </button>
  );
}

export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      aria-label={`Your order, ${count} ${count === 1 ? "item" : "items"}`}
      className="circle dark"
      to="/cart"
    >
      <BagIcon />
      {count ? <span className="badge">{count}</span> : null}
    </Link>
  );
}

export function TopBar({
  title,
  back,
  cart = true,
}: {
  title: string;
  back?: string;
  cart?: boolean;
}) {
  return (
    <div className="top">
      <BackButton {...(back ? { to: back } : {})} />
      <span className="title">{title}</span>
      {cart ? <CartButton /> : null}
    </div>
  );
}

export function Photo({
  src,
  alt,
  tone,
  className = "",
  children,
}: {
  src?: string | undefined;
  alt?: string;
  tone: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`photo ${src ? "has-img" : tone} ${className}`.trim()}>
      {src ? (
        <img alt={alt ?? ""} decoding="async" loading="lazy" src={src} />
      ) : null}
      {children}
    </div>
  );
}

export function storeImage(store: Store, hero = false): string | undefined {
  const card = store.cardMedia?.thumbnailUrl ?? store.cardMedia?.sourceUrl;
  const big = store.heroMedia?.sourceUrl ?? store.heroMedia?.thumbnailUrl;
  return (hero ? (big ?? card) : (card ?? big)) ?? store.imageUrl;
}

export function StatusPill({ open }: { open: boolean }) {
  return (
    <span className={`status ${open ? "open" : "closed"}`}>
      {open ? "Open" : "Closed"}
    </span>
  );
}

export function StoreFacts({
  store,
  fromMinor,
  full = false,
}: {
  store: Store;
  fromMinor?: number | undefined;
  full?: boolean;
}) {
  return (
    <div className="facts">
      {fromMinor !== undefined ? (
        <span>
          <TagIcon />
          <b>From {formatMoney(fromMinor)}</b>
        </span>
      ) : null}
      <span>
        <TruckIcon />
        {deliverySummary(store, full)}
      </span>
      <span>
        <ClockIcon />
        {hoursLabel(store.openingHours)}
      </span>
      <StatusPill open={isOpenNow(store)} />
    </div>
  );
}

export function storeTone(store: Store): string {
  return toneFor(store.category || store.name);
}

export function FloatingCart() {
  const { state, count, subtotal } = useCart();
  if (!count || !state.store) return null;
  return (
    <div className="float">
      <Link className="float-btn" to="/cart">
        <span>
          {count} {count === 1 ? "item" : "items"} · {state.store.name}
        </span>
        <span className="float-total">View cart {formatMoney(subtotal)}</span>
      </Link>
    </div>
  );
}
