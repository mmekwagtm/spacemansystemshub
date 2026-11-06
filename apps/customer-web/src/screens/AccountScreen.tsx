import { isAppError } from "@spaceman/app-errors";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useCustomer } from "../context";
import { GoogleMark, InfoIcon } from "../icons";
import { Brand, BackButton } from "../ui";

function messageFor(error: unknown): string {
  return isAppError(error)
    ? error.userMessage
    : "Something went wrong. Please try again.";
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(action: () => Promise<unknown>, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      return true;
    } catch (caught) {
      setError(messageFor(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, notice, run, setError };
}

function Messages({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ok" role="status">
          {notice}
        </div>
      ) : null}
    </>
  );
}

function SignInForms({ onDone }: { onDone(): void }) {
  const { identity } = useCustomer();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { busy, error, notice, run, setError } = useAction();
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    if (signup) {
      const displayName = String(data.get("displayName") ?? "").trim();
      if (displayName.length < 2) {
        setError("Add your name so restaurants know who’s ordering.");
        return;
      }
      await run(
        () => identity.registerCustomer({ email, password, displayName }),
        "Account created. Check your inbox and open the link to verify your email.",
      );
    } else if (await run(() => identity.signIn(email, password))) onDone();
  }

  async function forgot(form: HTMLFormElement | null) {
    const email = form
      ? String(new FormData(form).get("email") ?? "").trim()
      : "";
    if (!email) {
      setError("Type your email address first, then tap Forgot password.");
      return;
    }
    await run(
      () => identity.sendStaffSetupLink(email),
      "If that email has an account, we’ve sent a link to reset the password.",
    );
  }

  return (
    <>
      <div className="authHead">
        <h1>{signup ? "Sign Up" : "Log In"}</h1>
        <p>
          {signup
            ? "Create an account to order faster."
            : "Please sign in to your existing account."}
        </p>
      </div>
      <div className="sheet flat">
        {identity.googleSignInAvailable ? (
          <>
            <button
              className="method google"
              disabled={busy}
              type="button"
              onClick={() =>
                void run(async () => {
                  const result = await identity.signInWithGoogle();
                  if (result) onDone();
                })
              }
            >
              <GoogleMark />
              Continue with Google
            </button>
            <div className="divider">
              <span>or use email</span>
            </div>
          </>
        ) : null}
        <form
          className="authForm"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          {signup ? (
            <>
              <label className="slbl" htmlFor="auName">
                Name
              </label>
              <input
                autoComplete="name"
                className="field"
                id="auName"
                name="displayName"
                placeholder="e.g. Thabo Mokoena"
                required
              />
            </>
          ) : null}
          <label className="slbl" htmlFor="auEmail">
            Email address
          </label>
          <input
            autoComplete="email"
            className="field"
            id="auEmail"
            inputMode="email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          />
          <label className="slbl" htmlFor="auPassword">
            Password
          </label>
          <input
            autoComplete={signup ? "new-password" : "current-password"}
            className="field"
            id="auPassword"
            minLength={8}
            name="password"
            placeholder={signup ? "At least 8 characters" : "Your password"}
            required
            type="password"
          />
          <Messages error={error} notice={notice} />
          <button className="cta" disabled={busy} type="submit">
            {busy ? "Please wait…" : signup ? "Sign up" : "Log in"}
          </button>
          {!signup ? (
            <button
              className="linkBtn"
              disabled={busy}
              type="button"
              onClick={(event) => void forgot(event.currentTarget.form)}
            >
              Forgot password?
            </button>
          ) : null}
        </form>
        <div className="switch">
          {signup ? "Already have an account?" : "Don’t have an account?"}
          <button
            type="button"
            onClick={() => setMode(signup ? "login" : "signup")}
          >
            {signup ? "Log in" : "Sign up"}
          </button>
        </div>
        <div className="note">
          <InfoIcon className="inline-icon" /> You can browse and send WhatsApp
          orders without an account. An account fills in your name and is needed
          for online card payment.
        </div>
      </div>
    </>
  );
}

function CompleteProfile() {
  const { identity, session } = useCustomer();
  const { busy, error, notice, run } = useAction();
  const [name, setName] = useState("");
  return (
    <div className="sheet flat">
      <h1 className="h1">Finish signing up</h1>
      <p className="small">
        You’re signed in as {session?.email}. Add your name to finish setting up
        your Spaceman account.
      </p>
      <label className="slbl" htmlFor="cpName">
        Name
      </label>
      <input
        autoComplete="name"
        className="field"
        id="cpName"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Messages error={error} notice={notice} />
      <button
        className="cta"
        disabled={busy || name.trim().length < 2}
        type="button"
        onClick={() =>
          void run(() =>
            identity.completeCustomerProfile({ displayName: name.trim() }),
          )
        }
      >
        Finish sign-up
      </button>
      <button
        className="linkBtn"
        disabled={busy}
        type="button"
        onClick={() => void run(() => identity.signOut())}
      >
        Log out
      </button>
    </div>
  );
}

export function AccountScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { identity, session, sessionLoading, sessionError, access } =
    useCustomer();
  const { busy, error, notice, run } = useAction();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const done = () => navigate(from);

  let body;
  if (sessionLoading) body = <p role="status">Restoring your session…</p>;
  else if (access.reason === "guest") body = <SignInForms onDone={done} />;
  else if (access.reason === "email_unverified")
    body = (
      <div className="sheet flat">
        <h1 className="h1">Verify your email</h1>
        <p className="small">
          We sent a verification link to {session?.email}. Open it, then come
          back and tap “I’ve verified”.
        </p>
        <Messages error={error} notice={notice} />
        <button
          className="cta"
          disabled={busy}
          type="button"
          onClick={() => void run(() => identity.syncClaims())}
        >
          I’ve verified
        </button>
        <button
          className="cta ghost cta-sm"
          disabled={busy}
          type="button"
          onClick={() =>
            void run(
              () => identity.resendVerification(),
              "Verification email sent.",
            )
          }
        >
          Resend email
        </button>
        <button
          className="linkBtn"
          disabled={busy}
          type="button"
          onClick={() => void run(() => identity.signOut())}
        >
          Log out
        </button>
      </div>
    );
  else if (access.reason === "profile_missing") body = <CompleteProfile />;
  else if (access.reason === "inactive" || access.reason === "wrong_role")
    body = (
      <div className="sheet flat">
        <h1 className="h1">Account unavailable</h1>
        <p className="small">
          This account can’t be used for customer orders. Contact Spaceman if
          you think this is a mistake.
        </p>
        <button
          className="cta ghost cta-sm"
          disabled={busy}
          type="button"
          onClick={() => void run(() => identity.signOut())}
        >
          Log out
        </button>
      </div>
    );
  else
    body = (
      <div className="sheet flat">
        <div className="acctCard">
          <i aria-hidden="true">
            {(session?.profile?.displayName ?? "?").charAt(0).toUpperCase()}
          </i>
          <div>
            <b className="acctName">{session?.profile?.displayName}</b>
            <span className="small">{session?.email}</span>
          </div>
        </div>
        <Messages error={error} notice={notice} />
        {from !== "/" ? (
          <button className="cta" type="button" onClick={done}>
            Continue
          </button>
        ) : null}
        <button
          className="cta ghost cta-sm"
          disabled={busy}
          type="button"
          onClick={() => void run(() => identity.signOut())}
        >
          Log out
        </button>
      </div>
    );

  return (
    <div className="authv">
      <div className="top">
        <BackButton to={from} />
        <span className="title">My account</span>
      </div>
      <div className="authBrand">
        <Brand />
      </div>
      {sessionError ? (
        <div className="err" role="alert">
          {sessionError}
        </div>
      ) : null}
      {body}
    </div>
  );
}
