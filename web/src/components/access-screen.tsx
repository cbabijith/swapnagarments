"use client";
import { useState, type FormEvent } from "react";
import {
  Scissors,
  ArrowRight,
  LockKeyhole,
  Check,
  RefreshCw,
} from "lucide-react";

export function AccessScreen({
  state,
  setupAvailable,
  error: connectionError,
  onSuccess,
}: {
  state: string;
  setupAvailable: boolean;
  error: string;
  onSuccess: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = state === "setup";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: setup ? "setup" : "signin",
          email: form.get("email"),
          password: form.get("password"),
          ...(setup
            ? { name: form.get("name"), setupToken: form.get("setupToken") }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      await onSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The connection was interrupted. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-page">
      <aside className="access-story">
        <div className="brand">
          <span className="brand-mark">
            <Scissors size={27} strokeWidth={1.3} />
          </span>
          <span className="brand-wordmark">
            swapna<span>GARMENTS</span>
          </span>
        </div>
        <div>
          <p className="eyebrow">A LITTLE MORE ORGANISED.</p>
          <h1>
            More time for
            <br />
            the work you love.
          </h1>
          <p>
            From the first measurement to the final stitch.
            <br />
            Give every detail a place to belong.
          </p>
          <div className="access-promises">
            <span>
              <Check size={16} />A clear start to every day
            </span>
            <span>
              <Check size={16} />
              Every garment, accounted for
            </span>
            <span>
              <Check size={16} />A calmer way to run your shop
            </span>
          </div>
        </div>
        <small>Made with care, for every stitch.</small>
      </aside>
      <main className="access-form">
        <div>
          {state === "loading" ? (
            <>
              <Scissors size={33} />
              <h2>Opening the studio…</h2>
              <p>Connecting to your workspace.</p>
            </>
          ) : state === "error" ? (
            <>
              <LockKeyhole size={29} />
              <h2>Your workspace is getting ready.</h2>
              <p>{connectionError}</p>
              <button
                className="button primary"
                onClick={() => void onSuccess()}
              >
                <RefreshCw size={16} />
                Try connection again
              </button>
            </>
          ) : (
            <>
              <span className="access-lock">
                <LockKeyhole size={21} />
              </span>
              <p className="eyebrow">YOUR EVERYDAY WORKSPACE</p>
              <h2>
                {setup ? "Welcome to your studio." : "Lovely to see you again."}
              </h2>
              <p>
                {setup
                  ? "Create your owner account to get started."
                  : "Sign in and pick up where you left off."}
              </p>
              {setup && !setupAvailable ? (
                <p className="form-error">
                  Owner setup needs a setup code configured in Railway. Please
                  finish the website connection first.
                </p>
              ) : (
                <form onSubmit={submit}>
                  <div className="form-grid">
                    {setup && (
                      <label className="field full-width">
                        Your name
                        <input
                          name="name"
                          required
                          maxLength={100}
                          autoComplete="name"
                        />
                      </label>
                    )}
                    <label className="field full-width">
                      Email address
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={150}
                        autoComplete="username"
                      />
                    </label>
                    <label className="field full-width">
                      Password
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={12}
                        maxLength={128}
                        autoComplete={
                          setup ? "new-password" : "current-password"
                        }
                      />
                      {setup && <small>Use at least 12 characters.</small>}
                    </label>
                    {setup && (
                      <label className="field full-width">
                        Owner setup code
                        <input
                          name="setupToken"
                          type="password"
                          required
                          autoComplete="off"
                          maxLength={200}
                        />
                        <small>
                          The private code provided when your website was
                          connected.
                        </small>
                      </label>
                    )}
                  </div>
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="button primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy
                      ? "Opening your workspace…"
                      : setup
                        ? "Create owner account"
                        : "Sign in"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
              <p className="access-privacy">
                <LockKeyhole size={12} />
                Your shop’s details stay private.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
