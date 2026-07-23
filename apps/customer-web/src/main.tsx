import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import {
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
        <Suspense fallback={<p role="status">Loading marketplace…</p>}>
          <Routes>
            <Route
              path="*"
              element={
                <CustomerApp
                  identityService={customerIdentityService}
                  marketplaceService={customerMarketplaceService}
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
