import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { merchantIdentityService } from "./identity";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App identityService={merchantIdentityService} />
  </StrictMode>
);
