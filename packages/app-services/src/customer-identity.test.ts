import type { CallableGateway } from "@spaceman/app-firebase";
import type { IdentitySession } from "@spaceman/app-types";
import type { AuthGateway } from "@spaceman/shared/auth";
import { describe, expect, it, vi } from "vitest";

import { createCustomerIdentityService } from "./index";

const profile = {
  id: "uid-1",
  email: "thabo@gmail.com",
  displayName: "Thabo Mokoena",
  role: "customer",
  status: "active",
  scope: { storeIds: [], deliveryZoneIds: [], regionIds: [] },
  schemaVersion: 1,
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:00:00.000Z",
} as unknown as NonNullable<IdentitySession["profile"]>;

function session(withProfile: boolean): IdentitySession {
  return {
    uid: "uid-1",
    email: "thabo@gmail.com",
    emailVerified: true,
    claims: null,
    profile: withProfile ? profile : null,
  };
}

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signInWithEmailPassword: vi.fn(),
    signUpWithEmailPassword: vi.fn(),
    signOut: vi.fn(),
    sendCurrentUserEmailVerification: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    refreshSession: vi.fn(),
    subscribe: vi.fn(),
    ...overrides,
  } as AuthGateway;
}

describe("customer identity service", () => {
  it("creates the customer profile on first Google sign-in", async () => {
    const refreshSession = vi
      .fn()
      .mockResolvedValueOnce(session(false))
      .mockResolvedValueOnce(session(false))
      .mockResolvedValueOnce(session(true));
    const invoke = vi.fn(async () => ({ id: "uid-1" }));
    const service = createCustomerIdentityService(
      gateway({
        refreshSession,
        signInWithGoogle: vi.fn(async () => ({
          uid: "uid-1",
          displayName: "Thabo Mokoena",
        })),
      }),
      { invoke } as unknown as CallableGateway,
    );

    expect(service.googleSignInAvailable).toBe(true);
    const result = await service.signInWithGoogle();

    expect(invoke).toHaveBeenCalledWith("registerCustomerProfile", {
      displayName: "Thabo Mokoena",
    });
    expect(refreshSession).toHaveBeenLastCalledWith(true);
    expect(result?.profile?.displayName).toBe("Thabo Mokoena");
  });

  it("does not re-register an existing customer", async () => {
    const invoke = vi.fn();
    const service = createCustomerIdentityService(
      gateway({
        refreshSession: vi.fn(async () => session(true)),
        signInWithGoogle: vi.fn(async () => ({
          uid: "uid-1",
          displayName: null,
        })),
      }),
      { invoke } as unknown as CallableGateway,
    );

    await service.signInWithGoogle();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("falls back to the email name and returns null after a redirect", async () => {
    const invoke = vi.fn(async () => ({ id: "uid-1" }));
    const signInWithGoogle = vi
      .fn()
      .mockResolvedValueOnce({ uid: "uid-1", displayName: "  " })
      .mockResolvedValueOnce(null);
    const service = createCustomerIdentityService(
      gateway({
        refreshSession: vi.fn(async () => session(false)),
        signInWithGoogle,
      }),
      { invoke } as unknown as CallableGateway,
    );

    await service.signInWithGoogle();
    expect(invoke).toHaveBeenCalledWith("registerCustomerProfile", {
      displayName: "thabo",
    });
    await expect(service.signInWithGoogle()).resolves.toBeNull();
  });

  it("reports Google as unavailable when the gateway lacks it", async () => {
    const service = createCustomerIdentityService(gateway(), {
      invoke: vi.fn(),
    } as unknown as CallableGateway);

    expect(service.googleSignInAvailable).toBe(false);
    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      code: "precondition_failed",
    });
  });

  it("completes a missing profile with the entered name", async () => {
    const invoke = vi.fn(async () => ({ id: "uid-1" }));
    const service = createCustomerIdentityService(
      gateway({ refreshSession: vi.fn(async () => session(false)) }),
      { invoke } as unknown as CallableGateway,
    );

    await service.completeCustomerProfile({
      displayName: "Lerato",
      phoneE164: "+27721234567",
    });
    expect(invoke).toHaveBeenCalledWith("registerCustomerProfile", {
      displayName: "Lerato",
      phoneE164: "+27721234567",
    });
  });
});
