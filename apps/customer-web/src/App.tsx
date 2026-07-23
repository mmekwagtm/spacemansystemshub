import { formatMoney } from "@spaceman/app-core";
import { isAppError, type AppError } from "@spaceman/app-errors";
import type {
  IdentityService,
  MarketplaceService,
} from "@spaceman/app-services";
import type {
  CustomerRegistrationInput,
  IdentitySession,
} from "@spaceman/app-types";
import { spacemanTokens } from "@spaceman/app-ui";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";

const CustomerMarketplace = lazy(async () => ({
  default: (await import("./MarketplacePanel")).MarketplacePanel,
}));

const customerJourneys = [
  "Browse active stores",
  "Build a single-store cart",
  "Validate a delivery quote",
  "Track paid orders",
];

interface AppProps {
  identityService: IdentityService;
  marketplaceService?: MarketplaceService;
}

function messageFor(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "Something went wrong. Please try again.";
}

export function App({ identityService, marketplaceService }: AppProps) {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showAccount, setShowAccount] = useState(false);

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

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: CustomerRegistrationInput = {
      email: String(data.get("email")),
      password: String(data.get("password")),
      displayName: String(data.get("displayName")),
    };
    await run(
      () => identityService.registerCustomer(input),
      "Account created. Check your inbox and verify your email before checkout.",
    );
  }

  const access = evaluateIdentityAccess(session, ["customer"]);

  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / customer-web</p>
      <h1>Marketplace foundation</h1>
      <p className="lead">
        Browse as a guest. An active customer account with a verified email is
        required before any protected checkout action.
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

      {marketplaceService ? (
        <Suspense fallback={<p role="status">Loading active catalog…</p>}>
          <CustomerMarketplace service={marketplaceService} />
        </Suspense>
      ) : null}

      <section aria-label="Customer journeys" className="grid">
        {customerJourneys.map((journey) => (
          <article className="card" key={journey}>
            <h2>{journey}</h2>
            <p>
              Shared contracts keep web and native customer identity on the same
              server-owned truth.
            </p>
          </article>
        ))}
      </section>

      {!loading && access.reason === "guest" ? (
        <section className="account-panel" aria-label="Customer account">
          <div className="account-heading">
            <div>
              <p className="eyebrow">Protected action</p>
              <h2>Sign in or create an account</h2>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => setShowAccount((value) => !value)}
            >
              {showAccount ? "Hide account forms" : "Continue to checkout"}
            </button>
          </div>
          {showAccount ? (
            <div className="forms">
              <form onSubmit={(event) => void signIn(event)}>
                <h3>Sign in</h3>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
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
              <form onSubmit={(event) => void register(event)}>
                <h3>Create customer account</h3>
                <label>
                  Name
                  <input name="displayName" autoComplete="name" required />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <button disabled={busy} type="submit">
                  Create account
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {!loading && access.reason === "email_unverified" ? (
        <section className="account-panel">
          <h2>Verify your email</h2>
          <p>
            We sent a verification link to {session?.email}. Open it, then
            refresh this session.
          </p>
          <div className="actions">
            <button
              disabled={busy}
              onClick={() =>
                void run(
                  () => identityService.resendVerification(),
                  "Verification email sent.",
                )
              }
            >
              Resend email
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(() => identityService.syncClaims())}
            >
              I verified — refresh
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void run(() => identityService.signOut())}
            >
              Sign out
            </button>
          </div>
        </section>
      ) : null}

      {!loading && session && access.reason === "profile_missing" ? (
        <section className="account-panel">
          <h2>Finish account synchronization</h2>
          <p>
            Your Firebase session exists, but its canonical profile or role
            claims are not ready.
          </p>
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
          <h2>Account access unavailable</h2>
          <p>
            Status: {session.profile?.status ?? "profile missing"}. This account
            cannot use customer checkout.
          </p>
          <button
            disabled={busy}
            onClick={() => void run(() => identityService.signOut())}
          >
            Sign out
          </button>
        </section>
      ) : null}

      {!loading && access.granted ? (
        <section className="account-panel">
          <h2>Customer account ready</h2>
          <p>
            Signed in as {session?.email}. Protected customer actions are
            unlocked.
          </p>
          <button
            disabled={busy}
            onClick={() => void run(() => identityService.signOut())}
          >
            Sign out
          </button>
        </section>
      ) : null}

      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>
          Money baseline:
        </span>{" "}
        {formatMoney(0)}; no payment order exists before verified provider
        confirmation.
      </footer>
    </main>
  );
}
