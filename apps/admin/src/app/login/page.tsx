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
    <div className="min-h-screen bg-[#121212] px-4">
      <div className="mx-auto mt-32 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1C1C1C] p-8">
        <h1 className="mb-6 text-center text-xl font-semibold text-white">
          Neko Admin
        </h1>

        {phase === 1 ? (
          <form onSubmit={onSubmitStep1} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm text-white/60"
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
                className="w-full rounded-xl border border-white/10 bg-[#2A2A2A] px-4 py-3 text-white outline-none focus:border-[#229EDF]"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-white/60"
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
                className="w-full rounded-xl border border-white/10 bg-[#2A2A2A] px-4 py-3 text-white outline-none focus:border-[#229EDF]"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#229EDF] py-3 font-semibold text-white transition hover:bg-[#1f8ec9] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitStep2} className="flex flex-col gap-4">
            <p className="text-center text-sm text-white/70">
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
              className="w-full rounded-xl border border-white/10 bg-[#2A2A2A] px-4 py-3 text-center font-mono text-3xl tracking-[0.35em] text-white outline-none focus:border-[#229EDF]"
              required
            />
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-[#229EDF] py-3 font-semibold text-white transition hover:bg-[#1f8ec9] disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="text-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
