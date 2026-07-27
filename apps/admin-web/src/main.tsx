import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import {
  adminCheckoutService,
  adminIdentityService,
  adminMarketplaceService,
  identityAdminService,
} from "./identity";
import "./styles.css";

const AdminApp = lazy(async () => ({ default: (await import("./App")).App }));
const queryClient = createSpacemanQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<p role="status">Loading admin workspace…</p>}>
          <Routes>
            <Route
              path="*"
              element={
                <AdminApp
                  checkoutAdminService={adminCheckoutService}
                  identityAdminService={identityAdminService}
                  identityService={adminIdentityService}
                  marketplaceService={adminMarketplaceService}
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
