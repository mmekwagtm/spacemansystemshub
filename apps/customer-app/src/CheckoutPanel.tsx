import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import {
  useCreateCheckoutSession,
  useCustomerOrders,
  useInitializePaystackPayment,
  useSearchDeliveryAddresses,
  useVerifyPaystackPayment,
} from "@spaceman/app-query";
import type { CartStore } from "@spaceman/app-state";
import type {
  CheckoutQuoteResult,
  DeliveryAddressCandidate,
} from "@spaceman/app-types";
import * as Linking from "expo-linking";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { customerCheckoutService } from "./identity";

interface CheckoutPanelProps {
  cartStore: CartStore;
  customerId?: string;
  checkoutAllowed: boolean;
  online: boolean;
  onRequireAccount(): void;
}

function randomToken(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function randomAddressSessionToken(): string {
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
  cartStore,
  customerId,
  checkoutAllowed,
  online,
  onRequireAccount,
}: CheckoutPanelProps) {
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getState,
    cartStore.getState,
  );
  const searchAddresses = useSearchDeliveryAddresses(customerCheckoutService);
  const createSession = useCreateCheckoutSession(customerCheckoutService);
  const initializePayment = useInitializePaystackPayment(
    customerCheckoutService,
  );
  const verifyPayment = useVerifyPaystackPayment(customerCheckoutService);
  const orders = useCustomerOrders(customerCheckoutService, customerId, {
    limit: 5,
  });
  const [query, setQuery] = useState("");
  const [sessionToken, setSessionToken] = useState(
    randomAddressSessionToken,
  );
  const [candidates, setCandidates] = useState<DeliveryAddressCandidate[]>([]);
  const [selection, setSelection] = useState<DeliveryAddressCandidate>();
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    randomToken("checkout"),
  );
  const [label, setLabel] = useState("Home");
  const [instructions, setInstructions] = useState("");
  const [quote, setQuote] = useState<CheckoutQuoteResult>();
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

  useEffect(() => {
    setQuote(undefined);
    setIdempotencyKey(randomToken("checkout"));
  }, [lineSignature, selection?.placeId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      trimmed.length < 3 ||
      !cart.store ||
      selection?.formattedText === trimmed
    ) {
      setCandidates([]);
      return;
    }
    if (!online) {
      setError("Connect to the internet to search delivery addresses.");
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
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
      clearTimeout(timer);
    };
  }, [
    cart.store,
    online,
    query,
    searchAddresses.mutateAsync,
    selection?.formattedText,
    sessionToken,
  ]);

  async function createQuote() {
    if (!checkoutAllowed || !customerId) {
      onRequireAccount();
      return;
    }
    if (!online) {
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
        channel: "customer_app",
        idempotencyKey,
        storeId: cart.store.id,
        lines: cart.lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
        addressSelection: {
          placeId: selection.placeId,
          sessionToken,
          label: label.trim() || "Delivery address",
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        },
      });
      setQuote(result);
      setNotice("Authoritative delivery quote ready for review.");
      setSessionToken(randomToken("address"));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function openPayment() {
    const checkoutSession = quote?.checkoutSession;
    if (!checkoutSession) return;
    if (!customerId) {
      onRequireAccount();
      return;
    }
    if (Date.parse(checkoutSession.quoteExpiresAt) <= Date.now()) {
      setQuote(undefined);
      setIdempotencyKey(randomToken("checkout"));
      setError("Your delivery quote expired. Request a new quote.");
      return;
    }
    if (!online) {
      setError("Connect to the internet before opening secure payment.");
      return;
    }

    setError("");
    try {
      const authorization = await initializePayment.mutateAsync({
        checkoutSessionId: checkoutSession.id,
      });
      cartStore.getState().setPendingCheckout({
        checkoutSessionId: checkoutSession.id,
        customerId,
        reference: authorization.reference,
      });
      await Linking.openURL(authorization.authorizationUrl);
      setNotice("Return to this app after completing Paystack checkout.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const checkPayment = useCallback(async () => {
    const pending = cartStore.getState().pendingCheckout;
    if (
      !pending ||
      !checkoutAllowed ||
      !customerId ||
      pending.customerId !== customerId
    )
      return;
    if (!online) {
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
        setIdempotencyKey(randomToken("checkout"));
        setNotice(
          result.status === "abandoned"
            ? "Payment was abandoned. No order was created."
            : "Payment failed. No order was created.",
        );
      }
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [
    cartStore,
    checkoutAllowed,
    customerId,
    online,
    verifyPayment.mutateAsync,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && ownsPendingCheckout) void checkPayment();
    });
    return () => subscription.remove();
  }, [cartStore, checkPayment, ownsPendingCheckout]);

  if (!cart.hydrated)
    return <Text accessibilityRole="text">Restoring your saved cart…</Text>;

  return (
    <View accessibilityLabel="Cart and checkout" style={styles.panel}>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>ONE-STORE CART</Text>
          <Text style={styles.title}>{cart.store?.name ?? "Your cart"}</Text>
        </View>
        <Text style={styles.total}>{formatMoney(provisionalSubtotal)}</Text>
      </View>

      {cart.lines.length === 0 ? (
        <Text style={styles.body}>
          Add an available menu item to begin checkout.
        </Text>
      ) : (
        <>
          {cart.lines.map((line) => (
            <View key={line.itemId} style={styles.line}>
              <Text style={styles.flex}>
                {line.name} · {formatMoney(line.unitPrice.amountMinor)}
              </Text>
              <View style={styles.quantity}>
                <CompactButton
                  disabled={cartLocked}
                  label="−"
                  accessibilityLabel={`Decrease ${line.name}`}
                  onPress={() =>
                    cartStore
                      .getState()
                      .updateQuantity(line.itemId, line.quantity - 1)
                  }
                />
                <Text>{line.quantity}</Text>
                <CompactButton
                  disabled={cartLocked}
                  label="+"
                  accessibilityLabel={`Increase ${line.name}`}
                  onPress={() =>
                    cartStore
                      .getState()
                      .updateQuantity(line.itemId, line.quantity + 1)
                  }
                />
              </View>
            </View>
          ))}
          <ActionButton
            disabled={cartLocked}
            label="Clear cart"
            secondary
            onPress={() => cartStore.getState().clear()}
          />
          {cartLocked ? (
            <Text style={styles.body}>
              Cart changes are paused until the pending payment is reconciled.
            </Text>
          ) : null}
          {pendingOwnedByAnotherAccount ? (
            <>
              <Text style={styles.body}>
                This local pending cart belongs to another account. Its payment
                can still reconcile through the signed webhook.
              </Text>
              <ActionButton
                label="Discard local pending cart"
                secondary
                onPress={() => cartStore.getState().clear({ force: true })}
              />
            </>
          ) : null}

          {!checkoutAllowed ? (
            <>
              <Text style={styles.body}>
                Your cart is saved. Sign in with a verified customer account to
                request a quote.
              </Text>
              <ActionButton
                label="Continue to account"
                onPress={onRequireAccount}
              />
            </>
          ) : (
            <View style={styles.fields}>
              <Field
                label="Address label"
                value={label}
                onChangeText={setLabel}
              />
              <Field
                label="Search a Mabopane delivery address"
                placeholder="Type at least 3 characters"
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setSelection(undefined);
                }}
              />
              {searchAddresses.isPending ? (
                <Text accessibilityRole="text">Searching addresses…</Text>
              ) : null}
              {candidates.map((candidate) => (
                <Pressable
                  accessibilityRole="button"
                  key={candidate.placeId}
                  onPress={() => {
                    setSelection(candidate);
                    setQuery(candidate.formattedText);
                    setCandidates([]);
                  }}
                  style={[
                    styles.address,
                    selection?.placeId === candidate.placeId &&
                      styles.addressSelected,
                  ]}
                >
                  <Text style={styles.addressTitle}>
                    {candidate.primaryText}
                  </Text>
                  <Text style={styles.body}>{candidate.secondaryText}</Text>
                </Pressable>
              ))}
              <Text style={styles.attribution}>Powered by Google</Text>
              <Field
                label="Delivery instructions (optional)"
                multiline
                value={instructions}
                onChangeText={setInstructions}
              />
              <ActionButton
                disabled={createSession.isPending || !selection}
                label={
                  createSession.isPending
                    ? "Calculating…"
                    : "Calculate delivery quote"
                }
                onPress={() => void createQuote()}
              />
            </View>
          )}
        </>
      )}

      {quote ? (
        <View style={styles.quote}>
          <Text style={styles.title}>Review server quote</Text>
          <Text style={styles.body}>
            Items: {formatMoney(quote.checkoutSession.itemSubtotal.amountMinor)}
          </Text>
          <Text style={styles.body}>
            Delivery:{" "}
            {formatMoney(quote.checkoutSession.deliveryFee.amountMinor)}
          </Text>
          <Text style={styles.body}>
            Route:{" "}
            {(
              quote.checkoutSession.routeSnapshot.distanceMetres / 1_000
            ).toFixed(1)}{" "}
            km · about{" "}
            {Math.ceil(
              quote.checkoutSession.routeSnapshot.durationSeconds / 60,
            )}{" "}
            min
          </Text>
          <Text style={styles.total}>
            Total: {formatMoney(quote.checkoutSession.total.amountMinor)}
          </Text>
          <Text style={styles.body}>
            Quote expires{" "}
            {new Date(quote.checkoutSession.quoteExpiresAt).toLocaleTimeString(
              "en-ZA",
            )}
            .
          </Text>
          <ActionButton
            disabled={initializePayment.isPending}
            label={
              initializePayment.isPending
                ? "Opening secure payment…"
                : "Pay securely with Paystack"
            }
            onPress={() => void openPayment()}
          />
        </View>
      ) : null}

      {ownsPendingCheckout ? (
        <ActionButton
          disabled={verifyPayment.isPending}
          label={
            verifyPayment.isPending ? "Checking payment…" : "Check payment"
          }
          secondary
          onPress={() => void checkPayment()}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.message, styles.error]}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="text" style={[styles.message, styles.success]}>
          {notice}
        </Text>
      ) : null}
      {orders.data?.records.length ? (
        <View accessibilityLabel="Recent paid orders" style={styles.quote}>
          <Text style={styles.title}>Recent orders</Text>
          {orders.data.records.map((order) => (
            <Text key={order.id} style={styles.body}>
              {order.storeSnapshot.name} ·{" "}
              {formatMoney(order.total.amountMinor)} · {order.payment.status} ·{" "}
              {order.fulfillment.status}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText(value: string): void;
  multiline?: boolean;
  placeholder?: string;
}

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        maxLength={inputProps.multiline ? 500 : 120}
        style={[styles.input, inputProps.multiline && styles.multiline]}
      />
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  onPress(): void;
  disabled?: boolean;
  secondary?: boolean;
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && styles.buttonTextSecondary]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CompactButton({
  label,
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.compactButton, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonTextSecondary}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1E5",
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 18,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  flex: { flex: 1 },
  eyebrow: {
    color: "#176079",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  title: { color: "#15272F", fontSize: 20, fontWeight: "700" },
  body: { color: "#46545C", fontSize: 15, lineHeight: 22 },
  total: { color: "#15272F", fontSize: 17, fontWeight: "700" },
  line: {
    alignItems: "center",
    borderBottomColor: "#D8E1E5",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  quantity: { alignItems: "center", flexDirection: "row", gap: 8 },
  fields: { gap: 12 },
  field: { gap: 6 },
  label: { color: "#15272F", fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#AEBCC4",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  address: {
    borderColor: "#D8E1E5",
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    padding: 10,
  },
  addressSelected: { borderColor: "#176079", borderWidth: 2 },
  addressTitle: { color: "#15272F", fontSize: 15, fontWeight: "700" },
  attribution: { color: "#68777E", fontSize: 12 },
  quote: {
    backgroundColor: "#EEF6F8",
    borderRadius: 10,
    gap: 8,
    padding: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#176079",
    borderColor: "#176079",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonSecondary: { backgroundColor: "#FFFFFF" },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  buttonTextSecondary: { color: "#176079", fontSize: 15, fontWeight: "700" },
  compactButton: {
    alignItems: "center",
    borderColor: "#176079",
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  message: { borderRadius: 8, padding: 12 },
  error: { backgroundColor: "#FCE8EC", color: "#8D1F35" },
  success: { backgroundColor: "#E5F5EE", color: "#126342" },
});
