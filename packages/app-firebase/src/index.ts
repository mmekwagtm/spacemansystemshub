import { isAppRole, isUserStatus } from "@spaceman/app-core";
import type { PublicFirebaseConfig } from "@spaceman/app-config";
import { AppError } from "@spaceman/app-errors";
import type { TrustedCommand } from "@spaceman/app-functions";
import type {
  CatalogMedia,
  IdentitySession,
  UserProfile,
} from "@spaceman/app-types";
import {
  normalizeIdentityClaims,
  type AuthGateway,
} from "@spaceman/shared/auth";
import {
  FirebaseError,
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from "firebase/app";
import * as FirebaseAuthModule from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  getAuth,
  getIdTokenResult,
  initializeAuth,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type Persistence,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore, type Firestore } from "firebase/firestore";
import {
  getFunctions,
  httpsCallable,
  type Functions,
} from "firebase/functions";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
}

export interface CallableGateway {
  invoke<TInput, TResult>(
    command: TrustedCommand,
    input: TInput,
  ): Promise<TResult>;
}

export interface CatalogMediaUpload {
  storeId: string;
  ownerId: string;
  assetId: string;
  contentType: CatalogMedia["contentType"];
  altText: string;
  original: Uint8Array;
  thumbnail: Uint8Array;
}

export interface CatalogMediaGateway {
  stage(input: CatalogMediaUpload): Promise<CatalogMedia>;
  remove(sourcePath: string, thumbnailPath: string): Promise<void>;
}

export interface PreparedCatalogMedia {
  contentType: CatalogMedia["contentType"];
  original: Uint8Array;
  thumbnail: Uint8Array;
}

export interface NativeAuthStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

type ReactNativeAuthExports = {
  getReactNativePersistence(storage: NativeAuthStorage): Persistence;
};

function getOrCreateApp(config: PublicFirebaseConfig): FirebaseApp {
  const appName = `spaceman-${config.appId}`;
  return getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(config, appName);
}

function clientFromApp(
  app: FirebaseApp,
  auth: Auth,
  functionsRegion: string,
): FirebaseClient {
  return {
    app,
    auth,
    firestore: getFirestore(app),
    functions: getFunctions(app, functionsRegion),
    storage: getStorage(app),
  };
}

export function createFirebaseClient(
  config: PublicFirebaseConfig,
  functionsRegion: string,
): FirebaseClient {
  const app = getOrCreateApp(config);
  return clientFromApp(app, getAuth(app), functionsRegion);
}

export function createNativeFirebaseClient(
  config: PublicFirebaseConfig,
  functionsRegion: string,
  storage: NativeAuthStorage,
): FirebaseClient {
  const app = getOrCreateApp(config);
  const reactNativeAuth =
    FirebaseAuthModule as unknown as ReactNativeAuthExports;
  let auth: Auth;
  try {
    auth = initializeAuth(app, {
      persistence: reactNativeAuth.getReactNativePersistence(storage),
    });
  } catch (error) {
    if (
      !(error instanceof FirebaseError) ||
      error.code !== "auth/already-initialized"
    )
      throw error;
    auth = getAuth(app);
  }
  return clientFromApp(app, auth, functionsRegion);
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date.toISOString() : null;
  }
  return null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    return null;
  return [...new Set(value)];
}

function normalizeUserProfile(
  id: string,
  value: Record<string, unknown>,
): UserProfile | null {
  const email = value.email;
  const displayName = value.displayName;
  const role = value.role;
  const status = value.status;
  const scope = value.scope;
  const createdAt = isoTimestamp(value.createdAt);
  const updatedAt = isoTimestamp(value.updatedAt);
  const createdBy = value.createdBy;
  const updatedBy = value.updatedBy;

  if (
    typeof email !== "string" ||
    typeof displayName !== "string" ||
    typeof role !== "string" ||
    !isAppRole(role) ||
    typeof status !== "string" ||
    !isUserStatus(status) ||
    typeof scope !== "object" ||
    scope === null ||
    createdAt === null ||
    updatedAt === null ||
    typeof createdBy !== "string" ||
    typeof updatedBy !== "string"
  ) {
    return null;
  }

  const rawScope = scope as Record<string, unknown>;
  const storeIds = stringArray(rawScope.storeIds);
  const deliveryZoneIds = stringArray(rawScope.deliveryZoneIds);
  const regionIds = stringArray(rawScope.regionIds);
  if (storeIds === null || deliveryZoneIds === null || regionIds === null)
    return null;

  const base: UserProfile = {
    id,
    email,
    displayName,
    role,
    status,
    scope: { storeIds, deliveryZoneIds, regionIds },
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
  };
  if (typeof value.phoneE164 === "string") base.phoneE164 = value.phoneE164;
  const archivedAt = isoTimestamp(value.archivedAt);
  if (archivedAt !== null) base.archivedAt = archivedAt;
  if (typeof value.testRunId === "string") base.testRunId = value.testRunId;
  return base;
}

async function buildIdentitySession(
  client: FirebaseClient,
  user: User,
  forceTokenRefresh = false,
): Promise<IdentitySession> {
  const [token, profileSnapshot] = await Promise.all([
    getIdTokenResult(user, forceTokenRefresh),
    getDoc(doc(client.firestore, "users", user.uid)),
  ]);
  const email = user.email;
  if (!email) {
    throw new AppError({
      code: "precondition_failed",
      source: "app-firebase/auth/session",
      message: "The authenticated Firebase user has no email address.",
      userMessage: "This account is missing an email address. Contact support.",
    });
  }

  return {
    uid: user.uid,
    email,
    emailVerified: user.emailVerified,
    claims: normalizeIdentityClaims(token.claims),
    profile: profileSnapshot.exists()
      ? normalizeUserProfile(profileSnapshot.id, profileSnapshot.data())
      : null,
  };
}

export function createFirebaseAuthGateway(client: FirebaseClient): AuthGateway {
  const { auth } = client;
  return {
    async signInWithEmailPassword(email, password) {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        return { uid: credential.user.uid };
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/auth/sign-in");
      }
    },
    async signUpWithEmailPassword(email, password) {
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        return { uid: credential.user.uid };
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/auth/sign-up");
      }
    },
    signOut: () => signOut(auth),
    async sendCurrentUserEmailVerification() {
      if (!auth.currentUser) {
        throw new AppError({
          code: "authentication_required",
          source: "app-firebase/auth/verify-email",
          message: "Email verification requires an authenticated user.",
          userMessage: "Sign in before requesting another verification email.",
        });
      }
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/auth/verify-email");
      }
    },
    async sendPasswordResetEmail(email) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/auth/password-reset");
      }
    },
    async refreshSession(forceTokenRefresh = false) {
      if (!auth.currentUser) return null;
      if (forceTokenRefresh) await reload(auth.currentUser);
      return buildIdentitySession(client, auth.currentUser, forceTokenRefresh);
    },
    subscribe(listener, onError) {
      return onIdTokenChanged(
        auth,
        (user) => {
          if (!user) {
            listener(null);
            return;
          }
          void buildIdentitySession(client, user)
            .then(listener)
            .catch((error: unknown) =>
              onError(mapFirebaseError(error, "app-firebase/auth/session")),
            );
        },
        (error) =>
          onError(mapFirebaseError(error, "app-firebase/auth/observer")),
      );
    },
  };
}

export function createCallableGateway(client: FirebaseClient): CallableGateway {
  return {
    async invoke<TInput, TResult>(
      command: TrustedCommand,
      input: TInput,
    ): Promise<TResult> {
      try {
        const callable = httpsCallable<TInput, TResult>(
          client.functions,
          command,
        );
        const result = await callable(input);
        return result.data;
      } catch (error) {
        throw mapFirebaseError(error, `app-firebase/callable/${command}`);
      }
    },
  };
}

export function createCatalogMediaGateway(
  client: FirebaseClient,
): CatalogMediaGateway {
  return {
    async stage(input) {
      if (
        input.original.byteLength === 0 ||
        input.original.byteLength > 5_000_000
      ) {
        throw new AppError({
          code: "invalid_input",
          source: "app-firebase/catalog-media",
          message: "Catalog source image must be between 1 byte and 5 MB.",
          userMessage: "Choose a JPEG, PNG, or WebP image smaller than 5 MB.",
        });
      }
      if (
        input.thumbnail.byteLength === 0 ||
        input.thumbnail.byteLength > 750_000
      ) {
        throw new AppError({
          code: "invalid_input",
          source: "app-firebase/catalog-media",
          message: "Catalog thumbnail must be between 1 byte and 750 KB.",
          userMessage: "The generated catalog thumbnail is too large.",
        });
      }

      const extension =
        input.contentType === "image/jpeg"
          ? "jpg"
          : input.contentType === "image/png"
            ? "png"
            : "webp";
      const prefix = `catalog/${input.storeId}/staging/${input.ownerId}/${input.assetId}`;
      const sourcePath = `${prefix}/source.${extension}`;
      const thumbnailPath = `${prefix}/thumbnail.${extension}`;
      try {
        const sourceReference = storageRef(client.storage, sourcePath);
        const thumbnailReference = storageRef(client.storage, thumbnailPath);
        await Promise.all([
          uploadBytes(sourceReference, input.original, {
            contentType: input.contentType,
          }),
          uploadBytes(thumbnailReference, input.thumbnail, {
            contentType: input.contentType,
          }),
        ]);
        const [sourceUrl, thumbnailUrl] = await Promise.all([
          getDownloadURL(sourceReference),
          getDownloadURL(thumbnailReference),
        ]);
        return {
          sourcePath,
          thumbnailPath,
          sourceUrl,
          thumbnailUrl,
          altText: input.altText.trim(),
          contentType: input.contentType,
          sizeBytes: input.original.byteLength,
        };
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/catalog-media/upload");
      }
    },
    async remove(sourcePath, thumbnailPath) {
      try {
        await Promise.all([
          deleteObject(storageRef(client.storage, sourcePath)),
          deleteObject(storageRef(client.storage, thumbnailPath)),
        ]);
      } catch (error) {
        throw mapFirebaseError(error, "app-firebase/catalog-media/remove");
      }
    },
  };
}

interface BrowserCatalogFile {
  size: number;
  type: string;
}

interface BrowserEncodedBlob {
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface BrowserImageSource {
  close(): void;
  height: number;
  width: number;
}

interface BrowserCanvas {
  height: number;
  width: number;
  getContext(type: "2d"): {
    drawImage(
      source: BrowserImageSource,
      x: number,
      y: number,
      width: number,
      height: number,
    ): void;
  } | null;
  toBlob(
    callback: (blob: BrowserEncodedBlob | null) => void,
    contentType: string,
    quality: number,
  ): void;
}

function browserMediaRuntime() {
  return globalThis as unknown as {
    createImageBitmap(file: BrowserCatalogFile): Promise<BrowserImageSource>;
    document: { createElement(name: "canvas"): BrowserCanvas };
  };
}

function canvasBlob(
  canvas: BrowserCanvas,
  contentType: CatalogMedia["contentType"],
  quality: number,
): Promise<BrowserEncodedBlob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(new Error("The browser could not encode the catalog image."));
      },
      contentType,
      quality,
    );
  });
}

async function resizeCatalogImage(
  source: BrowserImageSource,
  maximumDimension: number,
  contentType: CatalogMedia["contentType"],
  quality: number,
): Promise<Uint8Array> {
  const ratio = Math.min(
    1,
    maximumDimension / Math.max(source.width, source.height),
  );
  const canvas = browserMediaRuntime().document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * ratio));
  canvas.height = Math.max(1, Math.round(source.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser cannot prepare catalog images.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Uint8Array(
    await (await canvasBlob(canvas, contentType, quality)).arrayBuffer(),
  );
}

export async function prepareCatalogMediaFile(
  file: BrowserCatalogFile,
): Promise<PreparedCatalogMedia> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new AppError({
      code: "invalid_input",
      source: "app-firebase/catalog-media",
      message: `Unsupported catalog image type: ${file.type || "unknown"}.`,
      userMessage: "Choose a JPEG, PNG, or WebP catalog image.",
    });
  }
  if (file.size === 0 || file.size > 12_000_000) {
    throw new AppError({
      code: "invalid_input",
      source: "app-firebase/catalog-media",
      message: "Catalog image input must be between 1 byte and 12 MB.",
      userMessage: "Choose a catalog image smaller than 12 MB.",
    });
  }
  const contentType = file.type as CatalogMedia["contentType"];
  const source = await browserMediaRuntime().createImageBitmap(file);
  try {
    const [original, thumbnail] = await Promise.all([
      resizeCatalogImage(source, 1_600, contentType, 0.82),
      resizeCatalogImage(source, 480, contentType, 0.76),
    ]);
    if (original.byteLength > 5_000_000 || thumbnail.byteLength > 750_000) {
      throw new AppError({
        code: "invalid_input",
        source: "app-firebase/catalog-media",
        message: "Compressed catalog media exceeds the upload limits.",
        userMessage:
          "This image remains too large after compression. Choose a smaller image.",
      });
    }
    return { contentType, original, thumbnail };
  } finally {
    source.close();
  }
}

export function mapFirebaseError(error: unknown, source: string): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof FirebaseError) {
    const code = error.code;
    const appCode =
      code.includes("invalid-credential") ||
      code.includes("user-disabled") ||
      code.includes("unauthenticated")
        ? "authentication_required"
        : code.includes("permission")
          ? "authorization_denied"
          : code.includes("email-already") || code.includes("already-exists")
            ? "conflict"
            : code.includes("weak-password") || code.includes("invalid-email")
              ? "invalid_input"
              : code.includes("not-found")
                ? "not_found"
                : code.includes("failed-precondition")
                  ? "precondition_failed"
                  : code.includes("too-many") ||
                      code.includes("resource-exhausted")
                    ? "rate_limited"
                    : "service_unavailable";
    const userMessage =
      appCode === "authentication_required"
        ? "The email or password is incorrect, or the account is unavailable."
        : appCode === "conflict"
          ? "An account already exists for that email address."
          : appCode === "rate_limited"
            ? "Too many attempts were made. Wait and try again."
            : source ===
                "app-firebase/callable/searchDeliveryAddresses"
              ? "Delivery address search is temporarily unavailable. Please try again."
              : source.startsWith("app-firebase/auth/")
                ? "The identity service could not complete that request. Please try again."
                : "The requested service could not complete that request. Please try again.";
    return new AppError({
      code: appCode,
      source,
      message: error.message,
      userMessage,
      debug: { firebaseCode: code },
      cause: error,
    });
  }

  return new AppError({
    code: "unknown",
    source,
    message: "An unexpected Firebase client error occurred.",
    userMessage: "Something went wrong. Please try again.",
    cause: error,
  });
}
