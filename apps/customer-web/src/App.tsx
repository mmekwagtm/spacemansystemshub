import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { CustomerProvider, type CustomerServices } from "./context";
import { AccountScreen } from "./screens/AccountScreen";
import { CartScreen } from "./screens/CartScreen";
import { Home } from "./screens/Home";
import { ItemScreen } from "./screens/ItemScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { SentScreen } from "./screens/SentScreen";
import { NotFound, StoreScreen } from "./screens/StoreScreen";

interface AppProps {
  identityService: CustomerServices["identity"];
  marketplaceService?: CustomerServices["marketplace"];
  checkoutService?: CustomerServices["checkout"];
  cartStore?: CustomerServices["cart"];
  checkoutTestRunId?: string;
}

const DARK = new Set(["/cart"]);
const AUTH = new Set(["/account"]);

function Shell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const tone = DARK.has(pathname) ? " dark" : AUTH.has(pathname) ? " auth" : "";
  return (
    <main className={`app${tone}`}>
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<StoreScreen />} path="/r/:storeId" />
        <Route element={<ItemScreen />} path="/r/:storeId/i/:itemId" />
        <Route element={<CartScreen />} path="/cart" />
        <Route element={<SentScreen />} path="/sent" />
        <Route element={<LocationScreen />} path="/location" />
        <Route element={<AccountScreen />} path="/account" />
        <Route element={<NotFound what="page" />} path="*" />
      </Routes>
    </main>
  );
}

export function App({
  identityService,
  marketplaceService,
  checkoutService,
  cartStore,
  checkoutTestRunId,
}: AppProps) {
  return (
    <CustomerProvider
      services={{
        identity: identityService,
        ...(marketplaceService ? { marketplace: marketplaceService } : {}),
        ...(checkoutService ? { checkout: checkoutService } : {}),
        ...(cartStore ? { cart: cartStore } : {}),
        ...(checkoutTestRunId ? { checkoutTestRunId } : {}),
      }}
    >
      <Shell />
    </CustomerProvider>
  );
}
