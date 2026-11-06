import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const popup = vi.fn();
const redirect = vi.fn();

vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/auth")>()),
  signInWithPopup: (...args: unknown[]) => popup(...args),
  signInWithRedirect: (...args: unknown[]) => redirect(...args),
}));

const { withGoogleWebSignIn } = await import("./web-auth");

const client = { auth: {} } as never;
const base = {} as never;

describe("web Google sign-in", () => {
  beforeEach(() => {
    popup.mockReset();
    redirect.mockReset();
  });

  it("returns the Google user from the popup", async () => {
    popup.mockResolvedValue({
      user: { uid: "uid-1", displayName: "Thabo Mokoena" },
    });
    const gateway = withGoogleWebSignIn(base, client);

    await expect(gateway.signInWithGoogle?.()).resolves.toEqual({
      uid: "uid-1",
      displayName: "Thabo Mokoena",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("falls back to a redirect when the popup is blocked", async () => {
    popup.mockRejectedValue(new FirebaseError("auth/popup-blocked", "blocked"));
    redirect.mockResolvedValue(undefined);
    const gateway = withGoogleWebSignIn(base, client);

    await expect(gateway.signInWithGoogle?.()).resolves.toBeNull();
    expect(redirect).toHaveBeenCalledOnce();
  });

  it("explains a closed popup and an unconfigured domain", async () => {
    const gateway = withGoogleWebSignIn(base, client);
    popup.mockRejectedValueOnce(
      new FirebaseError("auth/popup-closed-by-user", "closed"),
    );
    await expect(gateway.signInWithGoogle?.()).rejects.toMatchObject({
      userMessage: "Google sign-in was closed before it finished.",
    });
    popup.mockRejectedValueOnce(
      new FirebaseError("auth/unauthorized-domain", "domain"),
    );
    await expect(gateway.signInWithGoogle?.()).rejects.toMatchObject({
      code: "service_unavailable",
    });
  });
});
