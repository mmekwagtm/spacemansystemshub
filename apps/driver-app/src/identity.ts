import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseExpoFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createNativeFirebaseClient
} from "@spaceman/app-firebase";
import { createIdentityService } from "@spaceman/app-services";

const client = createNativeFirebaseClient(
  parseExpoFirebaseConfig({
    EXPO_PUBLIC_FIREBASE_API_KEY:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_APP_ID:
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  }),
  process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? "africa-south1",
  AsyncStorage
);

export const driverIdentityService = createIdentityService(
  createFirebaseAuthGateway(client),
  createCallableGateway(client)
);
