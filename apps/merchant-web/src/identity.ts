import { parseViteFirebaseConfig } from "@spaceman/app-config";
import {
  createCallableGateway,
  createFirebaseAuthGateway,
  createFirebaseClient
} from "@spaceman/app-firebase";
import { createIdentityService } from "@spaceman/app-services";

const client = createFirebaseClient(
  parseViteFirebaseConfig(import.meta.env),
  import.meta.env.VITE_FUNCTIONS_REGION ?? "africa-south1"
);

export const merchantIdentityService = createIdentityService(
  createFirebaseAuthGateway(client),
  createCallableGateway(client)
);
