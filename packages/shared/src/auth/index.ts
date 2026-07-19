import type { AppRole } from "@spaceman/app-core";
import { AppError } from "@spaceman/app-errors";
import type { UserProfile } from "@spaceman/app-types";

export interface AuthGateway {
  signInWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signUpWithEmailPassword(email: string, password: string): Promise<{ uid: string }>;
  signOut(): Promise<void>;
}

export interface CustomerCredentials {
  email: string;
  password: string;
}

export function normalizeCustomerCredentials(credentials: CustomerCredentials): CustomerCredentials {
  const email = credentials.email.trim().toLowerCase();
  if (!email.includes("@") || credentials.password.length < 8) {
    throw new AppError({
      code: "invalid_input",
      source: "shared/auth",
      message: "Customer credentials did not meet the minimum format.",
      userMessage: "Enter a valid email address and a password with at least eight characters."
    });
  }

  return { email, password: credentials.password };
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
