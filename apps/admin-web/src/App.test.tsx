import type { IdentityAdminService, IdentityService } from "@spaceman/app-services";
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
const admin: IdentityAdminService = {
  inviteStaff: vi.fn(),
  updateStatus: vi.fn(),
  updateScope: vi.fn()
};

describe("Admin App", () => {
  it("requires invited staff authentication", async () => {
    render(<App identityAdminService={admin} identityService={identity} />);
    expect(await screen.findByRole("heading", { name: "Admin sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send secure setup link" })).toBeInTheDocument();
  });
});
