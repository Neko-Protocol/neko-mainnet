"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { requestCode, verifyCode, type AuthActionResult } from "./actions";

const initialState: AuthActionResult = { ok: false, message: "" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  const [requestState, requestFormAction, isRequesting] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      const value = String(formData.get("email") ?? "");
      const result = await requestCode(value);
      if (result.ok) {
        setEmail(value.trim().toLowerCase());
        setStep("code");
      }
      return result;
    },
    initialState
  );

  const [verifyState, verifyFormAction, isVerifying] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      const code = String(formData.get("code") ?? "");
      return verifyCode(email, code);
    },
    initialState
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121212] px-4">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#229EDF]/10 blur-[120px]" />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/5 bg-[#1C1C1C] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/Neko.svg"
            alt="Neko"
            width={56}
            height={56}
            className="mb-4 w-auto"
          />
          <h1 className="text-xl font-bold text-white">Neko Admin</h1>
        </div>

        {step === "email" ? (
          <>
            <p className="mb-6 text-center text-sm text-white/40">
              Sign in with your authorized email. We&apos;ll send you a code, no
              password needed.
            </p>
            <form action={requestFormAction} className="flex flex-col gap-3">
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="rounded-lg border border-white/10 bg-[#141414] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#229EDF]/50"
              />
              <button
                type="submit"
                disabled={isRequesting}
                className="rounded-lg bg-[#229EDF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a85bd] disabled:opacity-60"
              >
                {isRequesting ? "Sending..." : "Send code"}
              </button>
            </form>
            {requestState.message && (
              <p
                className={`mt-4 text-center text-sm ${
                  requestState.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {requestState.message}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-white/40">
              Enter the code we sent to{" "}
              <span className="text-white">{email}</span>.
            </p>
            <form action={verifyFormAction} className="flex flex-col gap-3">
              <input
                type="text"
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Code"
                className="rounded-lg border border-white/10 bg-[#141414] px-4 py-2.5 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/30 outline-none transition focus:border-[#229EDF]/50"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="rounded-lg bg-[#229EDF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a85bd] disabled:opacity-60"
              >
                {isVerifying ? "Verifying..." : "Verify code"}
              </button>
            </form>
            {verifyState.message && (
              <p className="mt-4 text-center text-sm text-red-400">
                {verifyState.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep("email")}
              className="mt-4 w-full text-center text-xs text-white/40 underline underline-offset-2 transition hover:text-white/70"
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </main>
  );
}
