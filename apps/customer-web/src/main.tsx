import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { customerIdentityService } from "./identity";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App identityService={customerIdentityService} />
  </StrictMode>
);
