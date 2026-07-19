import type { PublicFirebaseConfig } from "@spaceman/app-config";
import { AppError } from "@spaceman/app-errors";
import type { TrustedCommand } from "@spaceman/app-functions";
import { FirebaseError, getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
}

export interface FirebaseAuthGateway {
  signInWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signUpWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signOut(): Promise<void>;
}

export interface CallableGateway {
  invoke<TInput, TResult>(command: TrustedCommand, input: TInput): Promise<TResult>;
}

export function createFirebaseClient(
  config: PublicFirebaseConfig,
  functionsRegion: string
): FirebaseClient {
  const appName = `spaceman-${config.projectId}`;
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(config, appName);

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    functions: getFunctions(app, functionsRegion),
    storage: getStorage(app)
  };
}

export function createFirebaseAuthGateway(auth: Auth): FirebaseAuthGateway {
  return {
    async signInWithEmailPassword(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { uid: credential.user.uid };
    },
    async signUpWithEmailPassword(email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { uid: credential.user.uid };
    },
    signOut: () => signOut(auth)
  };
}

export function createCallableGateway(client: FirebaseClient): CallableGateway {
  return {
    async invoke<TInput, TResult>(command: TrustedCommand, input: TInput): Promise<TResult> {
      try {
        const callable = httpsCallable<TInput, TResult>(client.functions, command);
        const result = await callable(input);
        return result.data;
      } catch (error) {
        throw mapFirebaseError(error, `app-firebase/callable/${command}`);
      }
    }
  };
}

export function mapFirebaseError(error: unknown, source: string): AppError {
  if (error instanceof FirebaseError) {
    return new AppError({
      code: error.code.includes("permission") ? "authorization_denied" : "service_unavailable",
      source,
      message: error.message,
      userMessage: "The service could not complete that request. Please try again.",
      debug: { firebaseCode: error.code },
      cause: error
    });
  }

  return new AppError({
    code: "unknown",
    source,
    message: "An unexpected Firebase client error occurred.",
    userMessage: "Something went wrong. Please try again.",
    cause: error
  });
}
