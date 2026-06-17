/**
 * Validates JSON body shared by `/api/invitations` POST and `/api/strategies/[id]/invitations` POST.
 */
export function parseInvitationPostBody(body: Record<string, unknown>):
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      email: string;
      type: string;
      assigned_to: string | null;
      notes: string | null;
      expires_days: number;
      strategy_id: string | null;
    } {
  const emailRaw =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const EMAIL_RE =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const typeRaw = typeof body.type === "string" ? body.type.trim() : "user";

  const assigned_raw =
    typeof body.assigned_to === "string" ? body.assigned_to.trim() : "";
  const assigned_to = assigned_raw.length > 0 ? assigned_raw : null;

  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

  let expires_days = Number(body.expires_days);
  if (!Number.isFinite(expires_days)) expires_days = 7;
  if (![7, 14, 30].includes(expires_days)) {
    expires_days = 7;
  }

  const sidRaw =
    typeof body.strategy_id === "string" ? body.strategy_id.trim() : "";
  const strategy_id = sidRaw.length > 0 ? sidRaw : null;

  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return { ok: false, error: "Valid email address is required" };
  }

  return {
    ok: true,
    email: emailRaw,
    type: typeRaw,
    assigned_to,
    notes,
    expires_days,
    strategy_id,
  };
}
