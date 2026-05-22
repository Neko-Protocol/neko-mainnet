import Link from "next/link";
import { headers } from "next/headers";

type SetupOk = { qrDataUrl: string; secret: string; uri: string };
type SetupErr = { error: string };

export default async function SetupTotpPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3001";
  const forwarded = h.get("x-forwarded-proto");
  const proto =
    forwarded?.split(",")[0]?.trim() ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const baseUrl = `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/auth/setup-totp`, {
    cache: "no-store",
  });
  const data = (await res.json()) as SetupOk | SetupErr;

  if (!res.ok || "error" in data) {
    return (
      <div className="min-h-screen bg-[#121212] px-4 py-16 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1C1C1C] p-8">
          <h1 className="text-xl font-semibold text-white">TOTP Setup</h1>
          <p className="mt-4 text-sm text-red-400">
            {"error" in data ? data.error : "Setup failed"}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-[#229EDF] hover:text-[#1f8ec9]"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  const { qrDataUrl, secret } = data;

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1C1C1C] p-8">
        <h1 className="text-xl font-semibold text-white">TOTP Setup</h1>
        <p className="mt-4 text-sm text-white/70">
          Scan this QR code with Google Authenticator or Authy. You only need to
          do this once.
        </p>
        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="TOTP QR code"
            width={220}
            height={220}
            className="rounded-lg"
          />
        </div>
        <p className="mt-4 text-xs text-white/50">Secret key (manual entry)</p>
        <p className="mt-1 break-all font-mono text-sm text-white/90">
          {secret}
        </p>
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          After scanning, add{" "}
          <span className="font-mono text-amber-50">
            ADMIN_TOTP_SECRET={secret}
          </span>{" "}
          to your <span className="font-mono">.env.local</span>
        </div>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm font-medium text-[#229EDF] hover:text-[#1f8ec9]"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
