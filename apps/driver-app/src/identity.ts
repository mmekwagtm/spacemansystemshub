import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseExpoFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createNativeFirebaseClient
} from "@spaceman/app-firebase";
import { createIdentityService } from "@spaceman/app-services";

const client = createNativeFirebaseClient(
  parseExpoFirebaseConfig(process.env),
  process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? "africa-south1",
  AsyncStorage
);

export const driverIdentityService = createIdentityService(
  createFirebaseAuthGateway(client),
  createCallableGateway(client)
);
