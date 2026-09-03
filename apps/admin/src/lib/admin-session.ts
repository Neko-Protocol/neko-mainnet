// Supabase's own session controls (time-box, inactivity timeout) require
// the Pro plan and this project isn't on it, so a 1-hour admin session cap
// is enforced with our own cookie instead: set once at login with maxAge
// equal to the cap, so the browser itself drops it exactly when the
// session should end. The underlying Supabase access/refresh tokens would
// otherwise keep silently renewing forever (autoRefreshToken), so this is
// the actual mechanism forcing re-auth, not just a UI nicety.
export const ADMIN_SESSION_COOKIE = "admin_session_started";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;
