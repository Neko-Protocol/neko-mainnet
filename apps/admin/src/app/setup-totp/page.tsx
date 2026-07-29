"use client";

import Link from "next/link";
import { useState } from "react";
import { getTotpSetup } from "@/lib/auth-actions";

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
        <p className="text-xs text-admin-muted">{label}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-xs font-medium text-neko-blue hover:text-[#1f8ec9]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-admin-border bg-admin-elevated p-3 font-mono text-xs text-admin-text">
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
      const { qrDataUrl, secret, passwordHashCommand } =
        await getTotpSetup(email);
      setData({ qrDataUrl, secret, passwordHashCommand });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-admin-canvas px-4 py-16 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-10">
        <section className="rounded-xl border border-admin-border bg-admin-surface p-8">
          <h1 className="text-xl font-semibold text-white">
            Provision TOTP secret
          </h1>
          <p className="mt-2 text-sm text-admin-muted">
            Generate a one-time QR and secret for a new admin row in{" "}
            <span className="font-mono text-admin-text">admin_users</span>.
          </p>

          <form onSubmit={onGenerateQr} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="provision-email"
                className="mb-1 block text-sm text-admin-muted"
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
                className="w-full rounded-xl border border-admin-border bg-admin-elevated px-4 py-3 text-white outline-none focus:border-neko-blue"
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
              className="w-full rounded-lg bg-neko-accent py-3 font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate QR"}
            </button>
          </form>

          {data ? (
            <div className="mt-8 space-y-6 border-t border-admin-border pt-8">
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

        <section className="rounded-xl border border-admin-border bg-admin-surface p-8">
          <h2 className="text-lg font-semibold text-white">Instructions</h2>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-sm text-admin-muted">
            <li>Enter your email above and click Generate QR.</li>
            <li>
              Scan the QR code with Google Authenticator or Authy (or use the
              secret manually).
            </li>
            <li>
              Hash your password with bcrypt using the command shown (replace{" "}
              <span className="font-mono text-admin-text">YOUR_PASSWORD</span>).
            </li>
            <li>
              In Supabase dashboard → Table Editor →{" "}
              <span className="font-mono text-admin-text">admin_users</span> →
              insert row, for example:
              <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg border border-admin-border bg-admin-elevated p-3 font-mono text-xs text-admin-text">
                {`INSERT INTO admin_users (email, password_hash, totp_secret)
VALUES ('you@example.com', '$2b$10$...your_hash...', 'YOUR_BASE32_SECRET');`}
              </pre>
            </li>
            <li>
              Sign in at{" "}
              <Link
                href="/login"
                className="font-medium text-neko-blue hover:text-[#1f8ec9]"
              >
                /login
              </Link>
              .
            </li>
          </ol>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-neko-blue hover:text-[#1f8ec9]"
          >
            ← Back to login
          </Link>
        </section>
      </div>
    </div>
  );
}
