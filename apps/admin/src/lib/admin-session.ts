// Supabase's own session controls (time-box, inactivity timeout) require
// the Pro plan and this project isn't on it, so a 1-hour admin session cap
// is enforced with our own cookie instead: set once at login with maxAge
// equal to the cap, so the browser itself drops it exactly when the
// session should end. The underlying Supabase access/refresh tokens would
// otherwise keep silently renewing forever (autoRefreshToken), so this is
// the actual mechanism forcing re-auth, not just a UI nicety.
export const ADMIN_SESSION_COOKIE = "admin_session_started";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

/** Checks the cookie's own timestamp against real elapsed time rather than
 * just trusting that it's present: the cookie's browser-set expiry can be
 * edited (e.g. via devtools) without touching the value inside, so presence
 * alone isn't enough to enforce the cap. A value in the future is rejected
 * too — otherwise a forged one would make the elapsed time negative and
 * never trip the cap. */
export function isAdminSessionExpired(
  cookieValue: string | undefined
): boolean {
  const startedAt = Number(cookieValue);
  if (!Number.isFinite(startedAt) || startedAt > Date.now()) return true;
  return Date.now() - startedAt > ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
}
