import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import {
  useCreateCheckoutSession,
  useCustomerOrders,
  useInitializePaystackPayment,
  useSearchDeliveryAddresses,
  useVerifyPaystackPayment,
} from "@spaceman/app-query";
import type { CheckoutService } from "@spaceman/app-services";
import type { CartStore } from "@spaceman/app-state";
import type {
  CheckoutQuoteResult,
  DeliveryAddressCandidate,
} from "@spaceman/app-types";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

interface CheckoutPanelProps {
  service: CheckoutService;
  cartStore: CartStore;
  customerId?: string;
  testRunId?: string;
  checkoutAllowed: boolean;
  onRequireAccount(): void;
}

interface SelectedDeliveryAddress {
  candidate: DeliveryAddressCandidate;
  sessionToken: string;
}

function randomToken(prefix: string): string {
  const random =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

function randomAddressSessionToken(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`.slice(
    0,
    36,
  );
}

function errorMessage(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "Checkout could not continue. Please try again.";
}

export function CheckoutPanel({
  service,
  cartStore,
  customerId,
  testRunId,
  checkoutAllowed,
  onRequireAccount,
}: CheckoutPanelProps) {
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getState,
    cartStore.getState,
  );
  const searchAddresses = useSearchDeliveryAddresses(service);
  const createSession = useCreateCheckoutSession(service);
  const initializePayment = useInitializePaystackPayment(service);
  const verifyPayment = useVerifyPaystackPayment(service);
  const orders = useCustomerOrders(service, customerId, { limit: 5 });
  const [query, setQuery] = useState("");
  const [sessionToken, setSessionToken] = useState(
    randomAddressSessionToken,
  );
  const [candidates, setCandidates] = useState<DeliveryAddressCandidate[]>([]);
  const [selection, setSelection] = useState<SelectedDeliveryAddress>();
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    randomToken("checkout"),
  );
  const [label, setLabel] = useState("Home");
  const [instructions, setInstructions] = useState("");
  const [quote, setQuote] = useState<CheckoutQuoteResult>();
  const [quotedInputSignature, setQuotedInputSignature] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lineSignature = useMemo(
    () =>
      cart.lines
        .map((line) => `${line.itemId}:${line.quantity}`)
        .sort()
        .join("|"),
    [cart.lines],
  );
  const provisionalSubtotal = cart.lines.reduce(
    (total, line) => total + line.unitPrice.amountMinor * line.quantity,
    0,
  );
  const ownsPendingCheckout =
    checkoutAllowed &&
    Boolean(customerId) &&
    cart.pendingCheckout?.customerId === customerId;
  const cartLocked = cart.pendingCheckout !== undefined;
  const pendingOwnedByAnotherAccount =
    Boolean(customerId) &&
    cart.pendingCheckout !== undefined &&
    cart.pendingCheckout.customerId !== customerId;
  const quoteInputSignature = useMemo(
    () =>
      [
        lineSignature,
        selection?.candidate.placeId ?? "",
        label.trim() || "Delivery address",
        instructions.trim(),
      ].join("|"),
    [
      instructions,
      label,
      lineSignature,
      selection?.candidate.placeId,
    ],
  );
  const quoteInputsChanged =
    quote !== undefined && quotedInputSignature !== quoteInputSignature;

  useEffect(() => {
    void cartStore.hydrate();
  }, [cartStore]);

  useEffect(() => {
    setIdempotencyKey(randomToken("checkout"));
  }, [quoteInputSignature]);

  useEffect(() => {
    if (!quoteInputsChanged) return;
    setQuote(undefined);
    setQuotedInputSignature(undefined);
    setSelection(undefined);
    setCandidates([]);
    setSessionToken(randomAddressSessionToken());
    setNotice("Delivery details changed. Select the address again for a new quote.");
  }, [quoteInputsChanged]);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      trimmed.length < 3 ||
      !cart.store ||
      selection?.candidate.formattedText === trimmed
    ) {
      setCandidates([]);
      return;
    }
    if (!navigator.onLine) {
      setError("Connect to the internet to search delivery addresses.");
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void searchAddresses
        .mutateAsync({
          storeId: cart.store!.id,
          query: trimmed,
          sessionToken,
        })
        .then((results) => {
          if (active) {
            setCandidates(results.slice(0, 5));
            setError("");
          }
        })
        .catch((caught: unknown) => {
          if (active) setError(errorMessage(caught));
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    cart.store,
    query,
    searchAddresses.mutateAsync,
    selection?.candidate.formattedText,
    sessionToken,
  ]);

  async function createQuote() {
    if (!checkoutAllowed || !customerId) {
      onRequireAccount();
      return;
    }
    if (!navigator.onLine) {
      setError("Connect to the internet before requesting a delivery quote.");
      return;
    }
    if (!cart.store || cart.lines.length === 0 || !selection) {
      setError("Add an item and select a delivery address first.");
      return;
    }
    setError("");
    setNotice("");
    try {
      const result = await createSession.mutateAsync({
        channel: "customer_web",
        idempotencyKey,
        storeId: cart.store.id,
        lines: cart.lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
        addressSelection: {
          placeId: selection.candidate.placeId,
          sessionToken: selection.sessionToken,
          label: label.trim() || "Delivery address",
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        },
        ...(testRunId ? { testRunId } : {}),
      });
      setQuotedInputSignature(quoteInputSignature);
      setQuote(result);
      setNotice("Authoritative delivery quote ready for review.");
      setSessionToken(randomAddressSessionToken());
      setIdempotencyKey(randomToken("checkout"));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function openPayment() {
    const checkoutSession = quote?.checkoutSession;
    if (!checkoutSession) return;
    if (quotedInputSignature !== quoteInputSignature) {
      setError("Delivery details changed. Request a new quote before paying.");
      return;
    }
    if (!customerId) {
      onRequireAccount();
      return;
    }
    if (Date.parse(checkoutSession.quoteExpiresAt) <= Date.now()) {
      setQuote(undefined);
      setQuotedInputSignature(undefined);
      setSelection(undefined);
      setSessionToken(randomAddressSessionToken());
      setIdempotencyKey(randomToken("checkout"));
      setError("Your delivery quote expired. Request a new quote.");
      return;
    }
    if (!navigator.onLine) {
      setError("Connect to the internet before opening secure payment.");
      return;
    }
    const paymentWindow = window.open("about:blank", "_blank");
    if (paymentWindow) paymentWindow.opener = null;
    setError("");
    try {
      const authorization = await initializePayment.mutateAsync({
        checkoutSessionId: checkoutSession.id,
      });
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.location.replace(authorization.authorizationUrl);
      } else {
        const fallback = window.open(authorization.authorizationUrl, "_blank");
        if (!fallback) {
          setError(
            "Allow pop-ups for this site, then choose Pay securely with Paystack again.",
          );
          return;
        }
        fallback.opener = null;
      }
      cartStore.getState().setPendingCheckout({
        checkoutSessionId: checkoutSession.id,
        customerId,
        reference: authorization.reference,
      });
      setNotice(
        "Paystack opened in a separate window. If it closes, return here to check or reopen payment.",
      );
    } catch (caught) {
      paymentWindow?.close();
      setError(errorMessage(caught));
    }
  }

  async function checkPayment() {
    const pending = cartStore.getState().pendingCheckout;
    if (
      !pending ||
      !checkoutAllowed ||
      !customerId ||
      pending.customerId !== customerId
    )
      return;
    if (!navigator.onLine) {
      setError("Connect to the internet to check payment.");
      return;
    }
    setError("");
    try {
      const result = await verifyPayment.mutateAsync({
        checkoutSessionId: pending.checkoutSessionId,
      });
      if (result.status === "paid") {
        cartStore.getState().clear({ force: true });
        setQuote(undefined);
        setNotice(`Payment verified. Order ${result.orderId ?? ""} created.`);
      } else if (result.status === "processing") {
        setNotice("Payment is still processing. Check again shortly.");
      } else {
        cartStore.getState().setPendingCheckout(undefined);
        setQuote(undefined);
        setQuotedInputSignature(undefined);
        setSelection(undefined);
        setCandidates([]);
        setSessionToken(randomAddressSessionToken());
        setIdempotencyKey(randomToken("checkout"));
        setNotice(
          result.status === "abandoned"
            ? "Payment was abandoned. No order was created."
            : result.status === "cancelled"
              ? "Payment was cancelled. No order was created."
              : "Payment failed. No order was created.",
        );
      }
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  useEffect(() => {
    const reconcile = () => {
      if (ownsPendingCheckout) void checkPayment();
    };
    window.addEventListener("focus", reconcile);
    return () => window.removeEventListener("focus", reconcile);
  });

  if (!cart.hydrated) return <p role="status">Restoring your saved cart…</p>;

  return (
    <section className="checkout-panel" aria-label="Cart and checkout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">One-store cart</p>
          <h2>{cart.store?.name ?? "Your cart"}</h2>
        </div>
        <strong>{formatMoney(provisionalSubtotal)}</strong>
      </div>
      {cart.lines.length === 0 ? (
        <p>Add an available menu item to begin checkout.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {cart.lines.map((line) => (
              <li key={line.itemId}>
                <span>
                  {line.name} · {formatMoney(line.unitPrice.amountMinor)}
                </span>
                <span className="quantity-actions">
                  <button
                    className="secondary compact"
                    disabled={cartLocked}
                    type="button"
                    aria-label={`Decrease ${line.name}`}
                    onClick={() =>
                      cartStore
                        .getState()
                        .updateQuantity(line.itemId, line.quantity - 1)
                    }
                  >
                    −
                  </button>
                  {line.quantity}
                  <button
                    className="secondary compact"
                    disabled={cartLocked}
                    type="button"
                    aria-label={`Increase ${line.name}`}
                    onClick={() =>
                      cartStore
                        .getState()
                        .updateQuantity(line.itemId, line.quantity + 1)
                    }
                  >
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button
            className="text-button"
            disabled={cartLocked}
            type="button"
            onClick={() => cartStore.getState().clear()}
          >
            Clear cart
          </button>
          {cartLocked ? (
            <p>
              Cart changes are paused until the pending payment is reconciled.
            </p>
          ) : null}
          {pendingOwnedByAnotherAccount ? (
            <>
              <p>
                This local pending cart belongs to another account. Its payment
                can still reconcile through the signed webhook.
              </p>
              <button
                className="text-button"
                type="button"
                onClick={() => cartStore.getState().clear({ force: true })}
              >
                Discard local pending cart
              </button>
            </>
          ) : null}
          {!checkoutAllowed ? (
            <>
              <p>
                Your cart is saved. Sign in with a verified customer account to
                request a quote.
              </p>
              <button type="button" onClick={onRequireAccount}>
                Continue to account
              </button>
            </>
          ) : (
            <div className="checkout-fields">
              <label>
                Address label
                <input
                  value={label}
                  maxLength={120}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              <label>
                Search a Mabopane delivery address
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (selection)
                      setSessionToken(randomAddressSessionToken());
                    setSelection(undefined);
                  }}
                  placeholder="Type at least 3 characters"
                />
              </label>
              {searchAddresses.isPending ? (
                <p role="status">Searching addresses…</p>
              ) : null}
              {candidates.length > 0 ? (
                <div className="address-results" role="listbox">
                  {candidates.map((candidate) => (
                    <button
                      className={
                        selection?.candidate.placeId === candidate.placeId
                          ? "address-option selected"
                          : "address-option"
                      }
                      key={candidate.placeId}
                      role="option"
                      aria-selected={
                        selection?.candidate.placeId === candidate.placeId
                      }
                      type="button"
                      onClick={() => {
                        setSelection({ candidate, sessionToken });
                        setQuery(candidate.formattedText);
                        setCandidates([]);
                      }}
                    >
                      <strong>{candidate.primaryText}</strong>
                      <span>{candidate.secondaryText}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <small>Powered by Google</small>
              <label>
                Delivery instructions (optional)
                <textarea
                  value={instructions}
                  maxLength={500}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </label>
              <button
                disabled={createSession.isPending || !selection || !!quote}
                type="button"
                onClick={() => void createQuote()}
              >
                {createSession.isPending
                  ? "Calculating…"
                  : quote
                    ? "Quote ready"
                    : "Calculate delivery quote"}
              </button>
            </div>
          )}
        </>
      )}
      {quote ? (
        <div className="quote-card">
          <h3>Review server quote</h3>
          <p>
            Items: {formatMoney(quote.checkoutSession.itemSubtotal.amountMinor)}
          </p>
          <p>
            Delivery:{" "}
            {formatMoney(quote.checkoutSession.deliveryFee.amountMinor)}
          </p>
          <p>
            Route:{" "}
            {(
              quote.checkoutSession.routeSnapshot.distanceMetres / 1_000
            ).toFixed(1)}{" "}
            km · about{" "}
            {Math.ceil(
              quote.checkoutSession.routeSnapshot.durationSeconds / 60,
            )}{" "}
            min
          </p>
          <strong>
            Total: {formatMoney(quote.checkoutSession.total.amountMinor)}
          </strong>
          <p>
            Quote expires{" "}
            {new Date(quote.checkoutSession.quoteExpiresAt).toLocaleTimeString(
              "en-ZA",
            )}
            .
          </p>
          <button
            disabled={initializePayment.isPending}
            type="button"
            onClick={() => void openPayment()}
          >
            {initializePayment.isPending
              ? "Opening secure payment…"
              : "Pay securely with Paystack"}
          </button>
        </div>
      ) : null}
      {ownsPendingCheckout ? (
        <button
          className="secondary"
          disabled={verifyPayment.isPending}
          type="button"
          onClick={() => void checkPayment()}
        >
          {verifyPayment.isPending ? "Checking payment…" : "Check payment"}
        </button>
      ) : null}
      {error ? (
        <p className="message error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="message success" role="status">
          {notice}
        </p>
      ) : null}
      {orders.data?.records.length ? (
        <div className="quote-card" aria-label="Recent paid orders">
          <h3>Recent orders</h3>
          {orders.data.records.map((order) => (
            <p key={order.id}>
              {order.storeSnapshot.name} ·{" "}
              {formatMoney(order.total.amountMinor)}
              {" · "}
              {order.payment.status} · {order.fulfillment.status}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
