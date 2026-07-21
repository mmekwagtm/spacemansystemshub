import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { adminIdentityService, identityAdminService } from "./identity";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App identityAdminService={identityAdminService} identityService={adminIdentityService} />
  </StrictMode>
);
