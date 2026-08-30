/**
 * Resolves the configured RPC URL for the runtime it is used in.
 *
 * `NEXT_PUBLIC_STELLAR_RPC_URL` is normally `/api/rpc`, the gateway route that
 * forwards to the backend's endpoint pool. Keeping the switch in an env var
 * means routing traffic back to a provider directly is a config change, not a
 * deploy — which is what makes the migration reversible.
 *
 * A relative path works in the browser but not on the server, where `fetch`
 * needs an absolute URL, so server-side callers get it resolved against the
 * app's own origin.
 */
export function resolveRpcUrl(
  configured: string,
  appUrl: string | undefined = process.env.NEXT_PUBLIC_APP_URL
): string {
  if (!configured.startsWith("/")) return configured;

  // In the browser a relative path is already correct, and is preferable:
  // it follows whatever origin the app is actually served from.
  if (typeof window !== "undefined") return configured;

  const base = appUrl?.replace(/\/+$/, "");
  if (base) return `${base}${configured}`;

  // Server-side with no app URL configured — most likely local development.
  return `http://localhost:3000${configured}`;
}
