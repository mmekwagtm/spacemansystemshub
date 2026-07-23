import { parseViteFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createFirebaseClient,
} from "@spaceman/app-firebase";
import {
  createFirestoreRepositories,
  createIdentityService,
  createMarketplaceService,
} from "@spaceman/app-services";

const client = createFirebaseClient(
  parseViteFirebaseConfig(import.meta.env),
  import.meta.env.VITE_FUNCTIONS_REGION ?? "africa-south1",
);

const callable = createCallableGateway(client);

export const customerIdentityService = createIdentityService(
  createFirebaseAuthGateway(client),
  callable,
);
export const customerMarketplaceService = createMarketplaceService(
  createFirestoreRepositories(client.firestore),
  callable,
);
