"use client";

import Link from "next/link";
import { useState } from "react";

type SetupOk = {
  qrDataUrl: string;
  secret: string;
  passwordHashCommand: string;
};

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">{label}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-xs font-medium text-[#229EDF] hover:text-[#1f8ec9]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-[#2A2A2A] p-3 font-mono text-xs text-white/90">
        {text}
      </pre>
    </div>
  );
}

export default function SetupTotpPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SetupOk | null>(null);

  async function onGenerateQr(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const trimmed = email.trim();
      const res = await fetch(
        `/api/auth/setup-totp?email=${encodeURIComponent(trimmed)}`
      );
      const json = (await res.json()) as SetupOk & { error?: string };
      if (!res.ok || "error" in json) {
        setError(json.error ?? "Request failed");
        return;
      }
      const { qrDataUrl, secret, passwordHashCommand } = json;
      setData({ qrDataUrl, secret, passwordHashCommand });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-16 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-10">
        <section className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-8">
          <h1 className="text-xl font-semibold text-white">
            Provision TOTP secret
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Generate a one-time QR and secret for a new admin row in{" "}
            <span className="font-mono text-white/85">admin_users</span>.
          </p>

          <form onSubmit={onGenerateQr} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="provision-email"
                className="mb-1 block text-sm text-white/60"
              >
                Email address
              </label>
              <input
                id="provision-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full rounded-xl border border-white/10 bg-[#2A2A2A] px-4 py-3 text-white outline-none focus:border-[#229EDF]"
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
              {loading ? "Generating…" : "Generate QR"}
            </button>
          </form>

          {data ? (
            <div className="mt-8 space-y-6 border-t border-white/10 pt-8">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrDataUrl}
                  alt="TOTP QR code"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              </div>
              <CopyBlock label="Base32 secret" text={data.secret} />
              <CopyBlock
                label="Generate bcrypt hash (run locally)"
                text={data.passwordHashCommand}
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-8">
          <h2 className="text-lg font-semibold text-white">Instructions</h2>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-sm text-white/75">
            <li>Enter your email above and click Generate QR.</li>
            <li>
              Scan the QR code with Google Authenticator or Authy (or use the
              secret manually).
            </li>
            <li>
              Hash your password with bcrypt using the command shown (replace{" "}
              <span className="font-mono text-white/90">YOUR_PASSWORD</span>).
            </li>
            <li>
              In Supabase dashboard → Table Editor →{" "}
              <span className="font-mono text-white/90">admin_users</span> →
              insert row, for example:
              <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-[#2A2A2A] p-3 font-mono text-xs text-white/85">
                {`INSERT INTO admin_users (email, password_hash, totp_secret)
VALUES ('you@example.com', '$2b$10$...your_hash...', 'YOUR_BASE32_SECRET');`}
              </pre>
            </li>
            <li>
              Sign in at{" "}
              <Link
                href="/login"
                className="font-medium text-[#229EDF] hover:text-[#1f8ec9]"
              >
                /login
              </Link>
              .
            </li>
          </ol>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-[#229EDF] hover:text-[#1f8ec9]"
          >
            ← Back to login
          </Link>
        </section>
      </div>
    </div>
  );
}
