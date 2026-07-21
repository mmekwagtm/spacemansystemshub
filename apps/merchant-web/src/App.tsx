import { FULFILLMENT_STATUSES } from "@spaceman/app-core";
import { isAppError, type AppError } from "@spaceman/app-errors";
import type { IdentityService } from "@spaceman/app-services";
import type { IdentitySession } from "@spaceman/app-types";
import { spacemanTokens } from "@spaceman/app-ui";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import { useEffect, useState, type FormEvent } from "react";

const merchantCapabilities = ["Store profile", "Catalog", "Paid order queue", "Preparation lifecycle"];

interface AppProps {
  identityService: IdentityService;
}

function messageFor(error: unknown): string {
  return isAppError(error) ? error.userMessage : "Something went wrong. Please try again.";
}

export function App({ identityService }: AppProps) {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => identityService.subscribe(
    (nextSession) => {
      setSession(nextSession);
      setLoading(false);
    },
    (nextError: AppError) => {
      setError(nextError.userMessage);
      setLoading(false);
    }
  ), [identityService]);

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
    await run(() => identityService.signIn(String(data.get("email")), String(data.get("password"))));
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(
      () => identityService.sendStaffSetupLink(String(data.get("email"))),
      "If the invited account exists, a secure setup link has been requested."
    );
  }

  const access = evaluateIdentityAccess(session, ["merchant"], false);

  return (
    <main className="shell">
      <p className="eyebrow">Spaceman Systems / merchant-web</p>
      <h1>{access.granted ? "Merchant operations foundation" : "Merchant sign in"}</h1>
      <p className="lead">
        Merchant access is invitation-only and restricted to the stores in server-issued scope claims.
      </p>
      {loading ? <p role="status">Restoring your session…</p> : null}
      {error ? <p className="message error" role="alert">{error}</p> : null}
      {notice ? <p className="message success" role="status">{notice}</p> : null}

      {!loading && access.reason === "guest" ? (
        <section className="forms" aria-label="Merchant authentication">
          <form onSubmit={(event) => void signIn(event)}>
            <h2>Sign in</h2>
            <label>Email<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
            <button disabled={busy} type="submit">Sign in</button>
          </form>
          <form onSubmit={(event) => void resetPassword(event)}>
            <h2>Accept invitation or reset password</h2>
            <label>Invited email<input name="email" type="email" autoComplete="email" required /></label>
            <button className="secondary" disabled={busy} type="submit">Send secure setup link</button>
          </form>
        </section>
      ) : null}

      {!loading && session && access.reason === "profile_missing" ? (
        <section className="account-panel">
          <h2>Synchronize account claims</h2>
          <button disabled={busy} onClick={() => void run(() => identityService.syncClaims())}>Synchronize account</button>
        </section>
      ) : null}

      {!loading && session && (access.reason === "inactive" || access.reason === "wrong_role") ? (
        <section className="account-panel">
          <h2>Merchant access unavailable</h2>
          <p>Role: {session.profile?.role ?? "missing"} · Status: {session.profile?.status ?? "missing"}.</p>
          <p>Invited accounts remain blocked until an administrator activates them.</p>
          <button disabled={busy} onClick={() => void run(() => identityService.signOut())}>Sign out</button>
        </section>
      ) : null}

      {access.granted ? (
        <>
          <div className="account-heading">
            <p>Signed in as {session?.email}. Store access: {session?.claims?.storeIds.join(", ") || "none"}.</p>
            <button className="secondary" disabled={busy} onClick={() => void run(() => identityService.signOut())}>Sign out</button>
          </div>
          <section aria-label="Merchant capabilities" className="grid">
            {merchantCapabilities.map((capability) => (
              <article className="card" key={capability}>
                <h2>{capability}</h2>
                <p>All mutations remain routed through scope-checked trusted Functions.</p>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <footer>
        <span style={{ color: spacemanTokens.color.brand }}>Fulfillment contract:</span>{" "}
        {FULFILLMENT_STATUSES.join(" → ")}
      </footer>
    </main>
  );
}
