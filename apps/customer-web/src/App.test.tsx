import type { IdentityService } from "@spaceman/app-services";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

const guestIdentity: IdentityService = {
  subscribe(listener) {
    listener(null);
    return () => undefined;
  },
  signIn: vi.fn(),
  registerCustomer: vi.fn(),
  signOut: vi.fn(),
  resendVerification: vi.fn(),
  sendStaffSetupLink: vi.fn(),
  syncClaims: vi.fn()
};

describe("Customer App", () => {
  it("keeps browsing public and protects checkout behind identity", async () => {
    render(<App identityService={guestIdentity} />);
    expect(await screen.findByRole("heading", { name: "Marketplace foundation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to checkout" }));
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create customer account" })).toBeInTheDocument();
  });
});
