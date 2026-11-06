import { AppError } from "@spaceman/app-errors";
import type { AuthGateway } from "@spaceman/shared/auth";
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

import { mapFirebaseError, type FirebaseClient } from "./index";

/**
 * Web-only Google sign-in. Kept out of the package's main entry so the Expo
 * apps never bundle popup or redirect APIs.
 */

const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);

const CANCELLED_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

function googleError(error: unknown): AppError {
  const source = "app-firebase/auth/google";
  if (error instanceof FirebaseError) {
    if (CANCELLED_CODES.has(error.code))
      return new AppError({
        code: "precondition_failed",
        source,
        message: error.message,
        userMessage: "Google sign-in was closed before it finished.",
        debug: { firebaseCode: error.code },
        cause: error,
      });
    if (error.code === "auth/account-exists-with-different-credential")
      return new AppError({
        code: "conflict",
        source,
        message: error.message,
        userMessage:
          "This email already has a Spaceman account. Log in with your email and password.",
        debug: { firebaseCode: error.code },
        cause: error,
      });
    if (
      error.code === "auth/unauthorized-domain" ||
      error.code === "auth/operation-not-allowed"
    )
      return new AppError({
        code: "service_unavailable",
        source,
        message: error.message,
        userMessage:
          "Google sign-in isn't switched on for this site yet. Use email for now.",
        debug: { firebaseCode: error.code },
        cause: error,
      });
  }
  return mapFirebaseError(error, source);
}

export function withGoogleWebSignIn(
  gateway: AuthGateway,
  client: FirebaseClient,
): AuthGateway {
  return {
    ...gateway,
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        const credential = await signInWithPopup(client.auth, provider);
        return {
          uid: credential.user.uid,
          displayName: credential.user.displayName,
        };
      } catch (error) {
        if (
          error instanceof FirebaseError &&
          REDIRECT_FALLBACK_CODES.has(error.code)
        ) {
          try {
            await signInWithRedirect(client.auth, provider);
            return null;
          } catch (redirectError) {
            throw googleError(redirectError);
          }
        }
        throw googleError(error);
      }
    },
  };
}
