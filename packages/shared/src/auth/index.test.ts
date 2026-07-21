import type { IdentitySession, UserProfile } from "@spaceman/app-types";
import { describe, expect, it } from "vitest";

import { evaluateIdentityAccess, normalizeIdentityClaims } from "./index";

const profile: UserProfile = {
  id: "customer-1",
  email: "customer@example.com",
  displayName: "Customer",
  role: "customer",
  status: "active",
  scope: { storeIds: [], deliveryZoneIds: [], regionIds: [] },
  createdAt: "2026-07-21T00:00:00.000Z",
  createdBy: "customer-1",
  updatedAt: "2026-07-21T00:00:00.000Z",
  updatedBy: "customer-1"
};

const session: IdentitySession = {
  uid: profile.id,
  email: profile.email,
  emailVerified: true,
  profile,
  claims: { role: "customer", status: "active", ...profile.scope }
};

describe("identity access", () => {
  it("requires a verified active customer with matching claims", () => {
    expect(evaluateIdentityAccess(session, ["customer"]).reason).toBe("granted");
    expect(evaluateIdentityAccess({ ...session, emailVerified: false }, ["customer"]).reason)
      .toBe("email_unverified");
  });

  it("rejects missing or malformed canonical claims", () => {
    expect(normalizeIdentityClaims({ role: "customer", status: "active" })).toBeNull();
    expect(normalizeIdentityClaims({
      role: "driver",
      status: "active",
      storeIds: [],
      deliveryZoneIds: ["zone-1"],
      regionIds: []
    })).toMatchObject({ role: "driver", deliveryZoneIds: ["zone-1"] });
  });
});
