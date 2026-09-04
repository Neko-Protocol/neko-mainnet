import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Supabase's own session controls (time-box, inactivity timeout) require
// the Pro plan and this project isn't on it, so a 1-hour admin session cap
// is enforced with our own mechanism instead. The cookie holds only an
// opaque, unguessable session id (not a timestamp anyone with cookie write
// access to an authenticated browser could forge) — expires_at, the actual
// source of truth, lives in admin_sessions, writable only via service_role.
export const ADMIN_SESSION_COOKIE = "admin_session_id";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

/** Creates a session row for a just-verified admin login and returns its
 * id, to be stored as the (httpOnly) cookie's value. */
export async function createAdminSession(
  email: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  const { data, error } = await admin
    .from("admin_sessions")
    .insert({ email: email.toLowerCase(), expires_at: expiresAt.toISOString() })
    .select("id")
    .single();

  return error ? null : data.id;
}

/** True while the session id names a row that hasn't passed its
 * expires_at. A missing/unknown/expired id is never valid — there's no
 * client-controlled value left for an attacker to forge. */
export async function isAdminSessionValid(
  sessionId: string | undefined
): Promise<boolean> {
  if (!sessionId) return false;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data } = await admin
    .from("admin_sessions")
    .select("expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}

/** Best-effort cleanup on explicit sign-out; a session left behind just
 * expires on its own at expires_at either way. */
export async function deleteAdminSession(
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("admin_sessions").delete().eq("id", sessionId);
}
