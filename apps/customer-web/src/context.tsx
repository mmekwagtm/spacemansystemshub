import type { AppError } from "@spaceman/app-errors";
import type {
  CheckoutService,
  CustomerIdentityService,
  MarketplaceService,
} from "@spaceman/app-services";
import type { CartState, CartStore } from "@spaceman/app-state";
import type { IdentitySession } from "@spaceman/app-types";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { loadPin, savePin, type DeliveryPin } from "./domain/location";

export interface CustomerServices {
  identity: CustomerIdentityService;
  marketplace?: MarketplaceService;
  checkout?: CheckoutService;
  cart?: CartStore;
  checkoutTestRunId?: string;
}

export interface SentOrder {
  storeName: string;
  whatsappE164: string;
  message: string;
}

interface CustomerContextValue extends CustomerServices {
  session: IdentitySession | null;
  sessionLoading: boolean;
  sessionError: string;
  access: ReturnType<typeof evaluateIdentityAccess>;
  pin: DeliveryPin | null;
  setPin(pin: DeliveryPin | null): void;
  sentOrder: SentOrder | null;
  setSentOrder(order: SentOrder | null): void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({
  services,
  children,
}: {
  services: CustomerServices;
  children: ReactNode;
}) {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [pin, setPinState] = useState<DeliveryPin | null>(loadPin);
  const [sentOrder, setSentOrder] = useState<SentOrder | null>(null);

  useEffect(
    () =>
      services.identity.subscribe(
        (next) => {
          setSession(next);
          setSessionError("");
          setSessionLoading(false);
        },
        (error: AppError) => {
          setSessionError(error.userMessage);
          setSessionLoading(false);
        },
      ),
    [services.identity],
  );

  useEffect(() => {
    void services.cart?.hydrate();
  }, [services.cart]);

  const value = useMemo<CustomerContextValue>(
    () => ({
      ...services,
      session,
      sessionLoading,
      sessionError,
      access: evaluateIdentityAccess(session, ["customer"]),
      pin,
      setPin(next) {
        savePin(next);
        setPinState(next);
      },
      sentOrder,
      setSentOrder,
    }),
    [pin, sentOrder, services, session, sessionError, sessionLoading],
  );

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextValue {
  const value = useContext(CustomerContext);
  if (!value)
    throw new Error("useCustomer must be used inside CustomerProvider.");
  return value;
}

const EMPTY_CART: Pick<
  CartState,
  "store" | "lines" | "pendingCheckout" | "hydrated"
> = {
  store: undefined,
  lines: [],
  pendingCheckout: undefined,
  hydrated: true,
};

const noopSubscribe = () => () => undefined;

/** Reactive cart snapshot; an inert empty cart when no store is configured. */
export function useCart() {
  const { cart } = useCustomer();
  const state = useSyncExternalStore(
    cart ? cart.subscribe : noopSubscribe,
    cart ? cart.getState : () => EMPTY_CART as CartState,
    cart ? cart.getState : () => EMPTY_CART as CartState,
  );
  const count = state.lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = state.lines.reduce(
    (total, line) => total + line.unitPrice.amountMinor * line.quantity,
    0,
  );
  return { state, count, subtotal, store: cart };
}
