import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import {
  customerCartStore,
  customerCheckoutService,
  customerIdentityService,
  customerMarketplaceService,
} from "./identity";
import "./styles.css";

const CustomerApp = lazy(async () => ({
  default: (await import("./App")).App,
}));
const queryClient = createSpacemanQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <p className="boot" role="status">
              Loading Spaceman…
            </p>
          }
        >
          <CustomerApp
            cartStore={customerCartStore}
            checkoutService={customerCheckoutService}
            identityService={customerIdentityService}
            marketplaceService={customerMarketplaceService}
            {...(import.meta.env.VITE_PHASE4_TEST_RUN_ID
              ? { checkoutTestRunId: import.meta.env.VITE_PHASE4_TEST_RUN_ID }
              : {})}
          />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
