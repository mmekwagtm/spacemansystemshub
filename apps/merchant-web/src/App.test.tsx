import type { IdentityService } from "@spaceman/app-services";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

const identity: IdentityService = {
  subscribe(listener) { listener(null); return () => undefined; },
  signIn: vi.fn(),
  registerCustomer: vi.fn(),
  signOut: vi.fn(),
  resendVerification: vi.fn(),
  sendStaffSetupLink: vi.fn(),
  syncClaims: vi.fn()
};

describe("Merchant App", () => {
  it("requires invited merchant authentication", async () => {
    render(<App identityService={identity} />);
    expect(await screen.findByRole("heading", { name: "Merchant sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send secure setup link" })).toBeInTheDocument();
  });
});
