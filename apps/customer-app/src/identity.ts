import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseExpoFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createNativeFirebaseClient,
} from "@spaceman/app-firebase";
import {
  createFirestoreRepositories,
  createIdentityService,
  createMarketplaceService,
} from "@spaceman/app-services";

const client = createNativeFirebaseClient(
  parseExpoFirebaseConfig(process.env),
  process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? "africa-south1",
  AsyncStorage,
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
