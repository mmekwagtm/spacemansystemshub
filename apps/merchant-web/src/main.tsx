import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import {
  merchantIdentityService,
  merchantMarketplaceService,
} from "./identity";
import "./styles.css";

const MerchantApp = lazy(async () => ({
  default: (await import("./App")).App,
}));
const queryClient = createSpacemanQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<p role="status">Loading merchant workspace…</p>}>
          <Routes>
            <Route
              path="*"
              element={
                <MerchantApp
                  identityService={merchantIdentityService}
                  marketplaceService={merchantMarketplaceService}
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
