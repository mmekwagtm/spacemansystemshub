import { formatMoney } from "@spaceman/app-core";
import type { Store } from "@spaceman/app-types";
import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useActiveStore } from "../catalog";
import { useCart, useCustomer } from "../context";
import {
  BagIcon,
  ChevronIcon,
  CloseIcon,
  MinusIcon,
  PinIcon,
  PlusIcon,
  WhatsAppIcon,
} from "../icons";
import { pinLabel } from "../domain/location";
import { orderChannelOf } from "../domain/store";
import { buildWhatsAppMessage, subtotalMinor } from "../domain/whatsapp";
import { BackButton } from "../ui";

const CheckoutPanel = lazy(async () => ({
  default: (await import("../CheckoutPanel")).CheckoutPanel,
}));

function WhatsAppCheckout({ store }: { store: Store }) {
  const navigate = useNavigate();
  const { session, pin, setSentOrder } = useCustomer();
  const { state } = useCart();
  const areas = store.whatsappDeliveryAreas ?? [];
  const [mode, setMode] = useState<"delivery" | "collect">(
    areas.length ? "delivery" : "collect",
  );
  const [areaName, setAreaName] = useState(areas[0]?.name ?? "");
  const [address, setAddress] = useState("");
  const [name, setName] = useState(session?.profile?.displayName ?? "");
  const [note, setNote] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    address?: string;
    minimum?: string;
  }>({});

  const area = areas.find((entry) => entry.name === areaName) ?? areas[0];
  const food = subtotalMinor(state.lines);
  const fee = mode === "delivery" && area ? area.fee.amountMinor : 0;

  function placeOrder() {
    const next: typeof errors = {};
    if (!name.trim())
      next.name = "Add your name so the kitchen knows whose order it is.";
    if (mode === "delivery" && !pin && address.trim().length < 5)
      next.address =
        "Add a street, unit or block, or pin your exact location, so the driver can find you.";
    if (food < store.minimumOrder.amountMinor)
      next.minimum = `The minimum order here is ${formatMoney(store.minimumOrder.amountMinor)}.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    const message = buildWhatsAppMessage({
      storeName: store.name,
      lines: state.lines,
      fulfilment:
        mode === "delivery" && area
          ? {
              mode: "delivery",
              areaName: area.name,
              feeMinor: area.fee.amountMinor,
              address,
            }
          : { mode: "collect" },
      pin: mode === "delivery" ? pin : null,
      customerName: name,
      note,
    });
    setSentOrder({
      storeName: store.name,
      whatsappE164: store.whatsappE164 ?? "",
      message,
    });
    navigate("/sent");
  }

  return (
    <div className="sheet">
      <div aria-label="Delivery or collection" className="seg" role="group">
        {areas.length ? (
          <button
            aria-pressed={mode === "delivery"}
            type="button"
            onClick={() => setMode("delivery")}
          >
            Delivery
          </button>
        ) : null}
        <button
          aria-pressed={mode === "collect"}
          type="button"
          onClick={() => setMode("collect")}
        >
          {areas.length ? "Collect" : "Collect only"}
        </button>
      </div>

      {mode === "delivery" && area ? (
        <>
          <label className="slbl" htmlFor="coZone">
            Delivery area
          </label>
          <select
            className="field"
            id="coZone"
            value={area.name}
            onChange={(event) => setAreaName(event.target.value)}
          >
            {areas.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name} · {formatMoney(entry.fee.amountMinor)} delivery
              </option>
            ))}
          </select>
          <span className="slbl">Exact location</span>
          <div className="locRow">
            <PinIcon />
            <span>
              {pin
                ? pinLabel(pin)
                : "No pin yet. A pin helps the driver find you."}
              {pin?.note ? (
                <>
                  <br />
                  <span className="small">{pin.note}</span>
                </>
              ) : null}
            </span>
            <Link className="linkBtn" state={{ from: "/cart" }} to="/location">
              {pin ? "Change" : "Pin it"}
            </Link>
          </div>
          <label className="slbl" htmlFor="coAddr">
            Delivery address
          </label>
          <textarea
            className="field"
            id="coAddr"
            maxLength={300}
            placeholder={`Street, unit or block${pin ? " (optional with a pin)" : ""}`}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          {errors.address ? <div className="err">{errors.address}</div> : null}
        </>
      ) : (
        <p className="small">
          Collect at {store.address.formattedAddress}. The kitchen replies with
          a ready time.
        </p>
      )}

      <label className="slbl" htmlFor="coName">
        Your name
      </label>
      <input
        autoComplete="given-name"
        className="field"
        id="coName"
        maxLength={80}
        placeholder="e.g. Thabo"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {errors.name ? <div className="err">{errors.name}</div> : null}
      <label className="slbl" htmlFor="coNote">
        Note for the kitchen
      </label>
      <input
        className="field"
        id="coNote"
        maxLength={200}
        placeholder="Optional, e.g. extra chakalaka"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className="total">
        <span className="t">
          <small>Total:</small>
          <b>{formatMoney(food + fee)}</b>
        </span>
        <button
          aria-expanded={showBreakdown}
          className="brk"
          type="button"
          onClick={() => setShowBreakdown((value) => !value)}
        >
          Breakdown <ChevronIcon />
        </button>
      </div>
      {showBreakdown ? (
        <div className="lines">
          <span>Food</span>
          <span>{formatMoney(food)}</span>
          <span>
            {mode === "delivery" && area
              ? `Delivery to ${area.name}`
              : "Collection"}
          </span>
          <span>{formatMoney(fee)}</span>
        </div>
      ) : null}
      {errors.minimum ? <div className="err">{errors.minimum}</div> : null}
      <button className="cta cta-sm" type="button" onClick={placeOrder}>
        <WhatsAppIcon />
        Place order on WhatsApp
      </button>
      <p className="small center">
        The kitchen confirms the final price on WhatsApp. You pay them directly;
        nothing is charged here.
      </p>
    </div>
  );
}

function PaystackCheckout() {
  const navigate = useNavigate();
  const { checkout, cart, session, access, checkoutTestRunId } = useCustomer();
  if (!checkout || !cart)
    return (
      <div className="sheet">
        <p className="small">Online checkout isn’t available right now.</p>
      </div>
    );
  return (
    <div className="sheet">
      <Suspense fallback={<p role="status">Loading checkout…</p>}>
        <CheckoutPanel
          cartStore={cart}
          checkoutAllowed={access.granted}
          hideLines
          service={checkout}
          onRequireAccount={() =>
            navigate("/account", { state: { from: "/cart" } })
          }
          {...(session ? { customerId: session.uid } : {})}
          {...(checkoutTestRunId ? { testRunId: checkoutTestRunId } : {})}
        />
      </Suspense>
    </div>
  );
}

export function CartScreen() {
  const { marketplace, cart } = useCustomer();
  const { state } = useCart();
  const { store, loading } = useActiveStore(marketplace, state.store?.id);
  const locked = state.pendingCheckout !== undefined;
  const storePath = state.store
    ? `/r/${encodeURIComponent(state.store.id)}`
    : "/";

  const top = (
    <div className="top">
      <BackButton to={storePath} />
      <span className="title">Cart</span>
      {state.store ? (
        <Link className="topLink" to={storePath}>
          Add more
        </Link>
      ) : null}
    </div>
  );

  if (!state.hydrated)
    return (
      <>
        {top}
        <p role="status">Restoring your saved cart…</p>
      </>
    );

  if (!state.store || state.lines.length === 0)
    return (
      <>
        {top}
        <div className="done empty-cart">
          <div className="tick dim">
            <span>
              <BagIcon />
            </span>
          </div>
          <h1>Your cart is empty</h1>
          <p>Pick a restaurant and tap + on a dish.</p>
          <Link className="cta narrow" to="/">
            Browse restaurants
          </Link>
        </div>
      </>
    );

  return (
    <>
      {top}
      <p className="from">
        From <b>{state.store.name}</b>
      </p>
      <ul className="citems">
        {state.lines.map((line) => (
          <li className="citem" key={line.itemId}>
            <div aria-hidden="true" className="photo" />
            <div className="cbody">
              <div className="chead">
                <span className="cname">{line.name}</span>
                <button
                  aria-label={`Remove ${line.name}`}
                  className="x"
                  disabled={locked}
                  type="button"
                  onClick={() => cart?.getState().removeItem(line.itemId)}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="cprice">
                {formatMoney(line.unitPrice.amountMinor * line.quantity)}
              </div>
              <div className="crow">
                <span className="copt">
                  {formatMoney(line.unitPrice.amountMinor)} each
                </span>
                <span className="mini">
                  <button
                    aria-label={`One less ${line.name}`}
                    disabled={locked}
                    type="button"
                    onClick={() =>
                      cart
                        ?.getState()
                        .updateQuantity(line.itemId, line.quantity - 1)
                    }
                  >
                    <MinusIcon />
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    aria-label={`One more ${line.name}`}
                    disabled={locked || line.quantity >= 20}
                    type="button"
                    onClick={() =>
                      cart
                        ?.getState()
                        .updateQuantity(line.itemId, line.quantity + 1)
                    }
                  >
                    <PlusIcon />
                  </button>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {store ? (
        orderChannelOf(store) === "whatsapp" && store.whatsappE164 ? (
          <WhatsAppCheckout store={store} />
        ) : (
          <PaystackCheckout />
        )
      ) : loading ? (
        <div className="sheet">
          <p role="status">Checking the restaurant…</p>
        </div>
      ) : (
        <div className="sheet">
          <p className="small">
            {state.store.name} isn’t taking orders right now, so this cart can’t
            be sent.
          </p>
          <button
            className="cta ghost cta-sm"
            disabled={locked}
            type="button"
            onClick={() => cart?.getState().clear()}
          >
            Clear cart
          </button>
        </div>
      )}
    </>
  );
}
