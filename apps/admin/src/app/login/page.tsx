"use client";

import { useRef, useState } from "react";
import { loginStep1, loginStep2 } from "@/lib/auth-actions";

type Phase = 1 | 2;

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function onSubmitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginStep1(email, password);
      if (data.ok) {
        setPhase(2);
        setCode("");
        requestAnimationFrame(() => codeInputRef.current?.focus());
        return;
      }
      setError(data.error ?? "Invalid credentials");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginStep2(code);
      if (data.ok) {
        window.location.href = "/dashboard";
        return;
      }
      setError(data.error ?? "Invalid code, try again");
      setCode("");
      codeInputRef.current?.focus();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setPhase(1);
    setError(null);
    setCode("");
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="admin-card w-full max-w-sm p-8">
        <h1 className="mb-6 text-center font-klein text-3xl text-white">
          Neko Admin
        </h1>

        {phase === 1 ? (
          <form onSubmit={onSubmitStep1} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm text-admin-muted"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input px-4 py-3"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-admin-muted"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input px-4 py-3"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-admin-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="admin-button-primary w-full py-3"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitStep2} className="flex flex-col gap-4">
            <p className="text-center text-sm text-admin-muted">
              Enter the 6-digit code from your authenticator app
            </p>
            <input
              ref={codeInputRef}
              id="totp"
              name="totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="admin-input px-4 py-3 text-center font-label text-3xl tracking-[0.35em]"
              required
            />
            {error ? (
              <p className="text-sm text-admin-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="admin-button-primary w-full py-3"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="text-center text-sm text-admin-muted underline-offset-4 hover:text-white hover:underline"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
