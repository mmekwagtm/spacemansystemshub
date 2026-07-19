import { AppError } from "@spaceman/app-errors";
import { z } from "zod";

const publicFirebaseConfigSchema = z.object({
  apiKey: z.string().trim().min(1),
  appId: z.string().trim().min(1),
  authDomain: z.string().trim().min(1),
  messagingSenderId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  storageBucket: z.string().trim().min(1)
});

export type PublicFirebaseConfig = z.infer<typeof publicFirebaseConfigSchema>;
export type EnvironmentValues = Readonly<Record<string, string | undefined>>;

function parsePublicFirebaseConfig(
  source: string,
  values: Record<string, string | undefined>
): PublicFirebaseConfig {
  const result = publicFirebaseConfigSchema.safeParse(values);
  if (result.success) {
    return result.data;
  }

  throw new AppError({
    code: "invalid_input",
    source,
    message: "Required public Firebase configuration is missing or invalid.",
    userMessage: "The app is not configured for this environment yet.",
    debug: result.error.flatten()
  });
}

export function parseViteFirebaseConfig(environment: EnvironmentValues): PublicFirebaseConfig {
  return parsePublicFirebaseConfig("app-config/vite", {
    apiKey: environment.VITE_FIREBASE_API_KEY,
    appId: environment.VITE_FIREBASE_APP_ID,
    authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID,
    projectId: environment.VITE_FIREBASE_PROJECT_ID,
    storageBucket: environment.VITE_FIREBASE_STORAGE_BUCKET
  });
}

export function parseExpoFirebaseConfig(environment: EnvironmentValues): PublicFirebaseConfig {
  return parsePublicFirebaseConfig("app-config/expo", {
    apiKey: environment.EXPO_PUBLIC_FIREBASE_API_KEY,
    appId: environment.EXPO_PUBLIC_FIREBASE_APP_ID,
    authDomain: environment.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: environment.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    projectId: environment.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: environment.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}
