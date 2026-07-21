import { isAppRole, isUserStatus, type AppRole } from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import type { IdentityClaims, IdentitySession, UserProfile } from "@spaceman/app-types";

export type IdentityUnsubscribe = () => void;

export interface AuthGateway {
  signInWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signUpWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signOut(): Promise<void>;
  sendCurrentUserEmailVerification(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  refreshSession(forceTokenRefresh?: boolean): Promise<IdentitySession | null>;
  subscribe(
    listener: (session: IdentitySession | null) => void,
    onError: (error: AppError) => void
  ): IdentityUnsubscribe;
}

export interface CustomerCredentials {
  email: string;
  password: string;
}

export type IdentityAccessReason =
  | "granted"
  | "guest"
  | "profile_missing"
  | "inactive"
  | "email_unverified"
  | "wrong_role";

export interface IdentityAccess {
  granted: boolean;
  reason: IdentityAccessReason;
  session: IdentitySession | null;
}

export function normalizeEmailAddress(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new AppError({
      code: "invalid_input",
      source: "shared/auth",
      message: "The email address is invalid.",
      userMessage: "Enter a valid email address."
    });
  }
  return normalized;
}

export function normalizeCustomerCredentials(credentials: CustomerCredentials): CustomerCredentials {
  const email = normalizeEmailAddress(credentials.email);
  if (credentials.password.length < 8 || credentials.password.length > 128) {
    throw new AppError({
      code: "invalid_input",
      source: "shared/auth",
      message: "The password did not meet the required length.",
      userMessage: "Enter a password between 8 and 128 characters."
    });
  }

  return { email, password: credentials.password };
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return null;
  }
  return [...new Set(value)];
}

export function normalizeIdentityClaims(value: Record<string, unknown>): IdentityClaims | null {
  const role = value.role;
  const status = value.status;
  const storeIds = stringArray(value.storeIds);
  const deliveryZoneIds = stringArray(value.deliveryZoneIds);
  const regionIds = stringArray(value.regionIds);

  if (
    typeof role !== "string"
    || !isAppRole(role)
    || typeof status !== "string"
    || !isUserStatus(status)
    || storeIds === null
    || deliveryZoneIds === null
    || regionIds === null
  ) {
    return null;
  }

  return { role, status, storeIds, deliveryZoneIds, regionIds };
}

export function evaluateIdentityAccess(
  session: IdentitySession | null,
  allowedRoles: readonly AppRole[],
  requireVerifiedCustomer = true
): IdentityAccess {
  if (!session) return { granted: false, reason: "guest", session };
  if (!session.profile || !session.claims) {
    return { granted: false, reason: "profile_missing", session };
  }
  if (session.profile.status !== "active" || session.claims.status !== "active") {
    return { granted: false, reason: "inactive", session };
  }
  if (
    requireVerifiedCustomer
    && session.profile.role === "customer"
    && !session.emailVerified
  ) {
    return { granted: false, reason: "email_unverified", session };
  }
  if (
    session.profile.role !== session.claims.role
    || !allowedRoles.includes(session.profile.role)
  ) {
    return { granted: false, reason: "wrong_role", session };
  }
  return { granted: true, reason: "granted", session };
}

export function assertActiveProfile(profile: UserProfile): UserProfile {
  if (profile.status !== "active") {
    throw new AppError({
      code: "authorization_denied",
      source: "shared/auth",
      message: `User ${profile.id} is ${profile.status}.`,
      userMessage: "Your account is not active yet."
    });
  }
  return profile;
}

export function assertRole(profile: UserProfile, allowedRoles: readonly AppRole[]): UserProfile {
  assertActiveProfile(profile);
  if (!allowedRoles.includes(profile.role)) {
    throw new AppError({
      code: "authorization_denied",
      source: "shared/auth",
      message: `Role ${profile.role} is not allowed for this route.`,
      userMessage: "You do not have access to that area."
    });
  }
  return profile;
}
