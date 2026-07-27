import { APP_ROLES, type UserStatus } from "@spaceman/app-core";
import { isAppError, type AppError } from "@spaceman/app-errors";
import type {
  CheckoutAdminService,
  IdentityAdminService,
  IdentityService,
  MarketplaceService,
} from "@spaceman/app-services";
import type {
  CreateStaffUserInput,
  IdentitySession,
  RoleScope,
} from "@spaceman/app-types";
import { spacemanTokens } from "@spaceman/app-ui";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";

const AdminMarketplace = lazy(async () => ({
  default: (await import("./MarketplacePanel")).MarketplacePanel,
}));
const CheckoutSettings = lazy(async () => ({
  default: (await import("./CheckoutSettingsPanel")).CheckoutSettingsPanel,
}));

const operationalAreas = [
  "Users and roles",
  "Stores and catalog",
  "Dispatch and orders",
  "Payments and audit",
];

interface AppProps {
  identityService: IdentityService;
  identityAdminService: IdentityAdminService;
  marketplaceService?: MarketplaceService;
  checkoutAdminService?: CheckoutAdminService;
}

function messageFor(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "Something went wrong. Please try again.";
}

function list(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function scopeFrom(data: FormData): RoleScope {
  return {
    storeIds: list(data.get("storeIds")),
    deliveryZoneIds: list(data.get("deliveryZoneIds")),
    regionIds: list(data.get("regionIds")),
  };
}

export function App({
  identityService,
  identityAdminService,
  marketplaceService,
  checkoutAdminService,
}: AppProps) {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(
    () =>
      identityService.subscribe(
        (nextSession) => {
          setSession(nextSession);
          setLoading(false);
        },
        (nextError: AppError) => {
          setError(nextError.userMessage);
          setLoading(false);
        },
      ),
    [identityService],
  );

  async function run(action: () => Promise<unknown>, successMessage = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(() =>
      identityService.signIn(
        String(data.get("email")),
        String(data.get("password")),
      ),
    );
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(
      () => identityService.sendStaffSetupLink(String(data.get("email"))),
      "If the invited account exists, a secure setup link has been requested.",
    );
  }

  async function inviteStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: CreateStaffUserInput = {
      email: String(data.get("email")),
      displayName: String(data.get("displayName")),
      role: String(data.get("role")) as CreateStaffUserInput["role"],
      scope: scopeFrom(data),
    };
    await run(async () => {
      await identityAdminService.inviteStaff(input);
      await identityService.sendStaffSetupLink(input.email);
    }, "Staff account invited and setup email requested.");
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(
      () =>
        identityAdminService.updateStatus({
          userId: String(data.get("userId")),
          status: String(data.get("status")) as UserStatus,
        }),
      "Account status updated. The user must refresh their session.",
    );
  }

  async function updateScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(
      () =>
        identityAdminService.updateScope({
          userId: String(data.get("userId")),
          scope: scopeFrom(data),
        }),
      "Account scope updated. The user must refresh their session.",
    );
  }

  const access = evaluateIdentityAccess(
    session,
    ["admin", "super_admin"],
    false,
  );
  const role = session?.profile?.role;

  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / admin-web</p>
      <h1>{access.granted ? "Operations foundation" : "Admin sign in"}</h1>
      <p className="lead">
        Admin access is invitation-only, backed by canonical profiles and
        server-issued claims.
      </p>
      {loading ? <p role="status">Restoring your session…</p> : null}
      {error ? (
        <p className="message error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="message success" role="status">
          {notice}
        </p>
      ) : null}

      {!loading && access.reason === "guest" ? (
        <section className="forms" aria-label="Admin authentication">
          <form onSubmit={(event) => void signIn(event)}>
            <h2>Sign in</h2>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            <button disabled={busy} type="submit">
              Sign in
            </button>
          </form>
          <form onSubmit={(event) => void resetPassword(event)}>
            <h2>Accept invitation or reset password</h2>
            <label>
              Invited email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button className="secondary" disabled={busy} type="submit">
              Send secure setup link
            </button>
          </form>
        </section>
      ) : null}

      {!loading && session && access.reason === "profile_missing" ? (
        <section className="account-panel">
          <h2>Synchronize account claims</h2>
          <button
            disabled={busy}
            onClick={() => void run(() => identityService.syncClaims())}
          >
            Synchronize account
          </button>
        </section>
      ) : null}

      {!loading &&
      session &&
      (access.reason === "inactive" || access.reason === "wrong_role") ? (
        <section className="account-panel">
          <h2>Admin access unavailable</h2>
          <p>
            Role: {role ?? "missing"} · Status:{" "}
            {session.profile?.status ?? "missing"}.
          </p>
          <button
            disabled={busy}
            onClick={() => void run(() => identityService.signOut())}
          >
            Sign out
          </button>
        </section>
      ) : null}

      {access.granted ? (
        <>
          <div className="account-heading">
            <p>
              Signed in as {session?.email} ({role}).
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(() => identityService.signOut())}
            >
              Sign out
            </button>
          </div>
          <section aria-label="Admin scope" className="grid">
            {operationalAreas.map((area) => (
              <article className="card" key={area}>
                <h2>{area}</h2>
                <p>
                  Role-, scope-, and transition-guarded workflows use trusted
                  Functions.
                </p>
              </article>
            ))}
          </section>
          <section className="account-panel">
            <h2>Staff identity lifecycle</h2>
            <div className="forms">
              {role === "super_admin" ? (
                <form onSubmit={(event) => void inviteStaff(event)}>
                  <h3>Invite staff</h3>
                  <label>
                    Name
                    <input name="displayName" required />
                  </label>
                  <label>
                    Email
                    <input name="email" type="email" required />
                  </label>
                  <label>
                    Role
                    <select name="role">
                      <option value="merchant">Merchant</option>
                      <option value="driver">Driver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>
                    Store IDs
                    <input name="storeIds" placeholder="store-1, store-2" />
                  </label>
                  <label>
                    Delivery zone IDs
                    <input name="deliveryZoneIds" />
                  </label>
                  <label>
                    Region IDs
                    <input name="regionIds" />
                  </label>
                  <button disabled={busy} type="submit">
                    Invite staff account
                  </button>
                </form>
              ) : null}
              <form onSubmit={(event) => void updateStatus(event)}>
                <h3>Update account status</h3>
                <label>
                  User ID
                  <input name="userId" required />
                </label>
                <label>
                  Status
                  <select name="status">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <button disabled={busy} type="submit">
                  Update status
                </button>
              </form>
              <form onSubmit={(event) => void updateScope(event)}>
                <h3>Replace account scope</h3>
                <label>
                  User ID
                  <input name="userId" required />
                </label>
                <label>
                  Store IDs
                  <input name="storeIds" />
                </label>
                <label>
                  Delivery zone IDs
                  <input name="deliveryZoneIds" />
                </label>
                <label>
                  Region IDs
                  <input name="regionIds" />
                </label>
                <button disabled={busy} type="submit">
                  Update scope
                </button>
              </form>
            </div>
          </section>
          {marketplaceService ? (
            <Suspense
              fallback={<p role="status">Loading marketplace operations…</p>}
            >
              <AdminMarketplace
                ownerId={session?.uid ?? ""}
                service={marketplaceService}
              />
            </Suspense>
          ) : null}
          {checkoutAdminService &&
          (role === "admin" || role === "super_admin") ? (
            <Suspense
              fallback={<p role="status">Loading checkout configuration…</p>}
            >
              <CheckoutSettings role={role} service={checkoutAdminService} />
            </Suspense>
          ) : null}
        </>
      ) : null}

      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>
          Canonical roles:
        </span>{" "}
        {APP_ROLES.join(", ")}
      </footer>
    </main>
  );
}
