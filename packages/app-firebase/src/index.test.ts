import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { mapFirebaseError } from "./index";

describe("Firebase error mapping", () => {
  it("maps authorization and throttling without exposing provider details", () => {
    expect(
      mapFirebaseError(
        new FirebaseError("functions/permission-denied", "private detail"),
        "app-firebase/callable/verifyPaystackPayment",
      ),
    ).toMatchObject({
      code: "authorization_denied",
      userMessage:
        "The requested service could not complete that request. Please try again.",
    });
    expect(
      mapFirebaseError(
        new FirebaseError("functions/resource-exhausted", "private detail"),
        "app-firebase/callable/searchDeliveryAddresses",
      ),
    ).toMatchObject({
      code: "rate_limited",
      userMessage: "Too many attempts were made. Wait and try again.",
    });
  });
});
