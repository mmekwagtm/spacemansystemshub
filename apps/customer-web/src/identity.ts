import { parseViteFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createFirebaseClient,
} from "@spaceman/app-firebase";
import {
  createCheckoutService,
  createFirestoreRepositories,
  createIdentityService,
  createMarketplaceService,
} from "@spaceman/app-services";
import { createCartStore } from "@spaceman/app-state";

const client = createFirebaseClient(
  parseViteFirebaseConfig(import.meta.env),
  import.meta.env.VITE_FUNCTIONS_REGION ?? "africa-south1",
);

const callable = createCallableGateway(client);
const repositories = createFirestoreRepositories(client.firestore);

export const customerIdentityService = createIdentityService(
  createFirebaseAuthGateway(client),
  callable,
);
export const customerMarketplaceService = createMarketplaceService(
  repositories,
  callable,
);
export const customerCheckoutService = createCheckoutService(
  repositories,
  callable,
);
export const customerCartStore = createCartStore({
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    removeItem: (key) => window.localStorage.removeItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  },
});
