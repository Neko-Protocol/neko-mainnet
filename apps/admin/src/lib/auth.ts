import { TOTP, Secret } from "otpauth";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function getTOTP(): TOTP {
  const secret = process.env.ADMIN_TOTP_SECRET ?? "";
  return new TOTP({
    issuer: "Neko Admin",
    label: process.env.ADMIN_EMAIL ?? "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function verifyTOTP(token: string): boolean {
  if (!process.env.ADMIN_TOTP_SECRET) return false;
  const totp = getTOTP();
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function checkCredentials(email: string, password: string): boolean {
  return (
    email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD
  );
}

export function makeSessionToken(): string {
  const payload = `${Date.now()}:${process.env.ADMIN_SESSION_SECRET ?? "neko"}`;
  return toBase64Url(payload);
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = fromBase64Url(token);
    const [ts, secret] = decoded.split(":");
    if (secret !== (process.env.ADMIN_SESSION_SECRET ?? "neko")) return false;
    const age = Date.now() - parseInt(ts, 10);
    return age < 86_400_000;
  } catch {
    return false;
  }
}
