/**
 * Session helpers used by middleware (Edge). Kept separate from auth.ts so
 * bcrypt/Superbase code is not bundled into the Edge runtime.
 */
export function makeSessionToken(): string {
  const payload = `${Date.now()}:${process.env.ADMIN_SESSION_SECRET ?? "neko"}`;
  return btoa(payload)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    let padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    if (pad) padded += "=".repeat(4 - pad);
    const decoded = atob(padded);
    const colonIdx = decoded.indexOf(":");
    const ts = decoded.slice(0, colonIdx);
    const secret = decoded.slice(colonIdx + 1);
    if (secret !== (process.env.ADMIN_SESSION_SECRET ?? "neko")) return false;
    return Date.now() - parseInt(ts, 10) < 86_400_000;
  } catch {
    return false;
  }
}
