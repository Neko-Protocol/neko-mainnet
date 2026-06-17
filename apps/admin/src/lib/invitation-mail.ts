import { Resend } from "resend";
import { INVITATION_TYPES } from "@/lib/invitations-schema";
import type { Invitation } from "@/lib/invitations-schema";

function typeLabel(type: string): string {
  const t = INVITATION_TYPES.find((x) => x.id === type);
  return t?.label ?? type;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteEmailHtml(invitation: Invitation): string {
  const inviteUrl = `https://dapp.nekoprotocol.xyz/invite?token=${encodeURIComponent(invitation.token)}`;
  const expiresAt = new Date(invitation.expires_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const lbl = escapeHtml(typeLabel(invitation.type));
  const expiresSafe = escapeHtml(expiresAt);
  return `
<div style="background:#121212;color:white;font-family:system-ui;padding:40px;border-radius:12px;max-width:480px">
  <h1 style="color:#229EDF;margin:0 0 16px">You're invited to Neko Protocol</h1>
  <p style="color:rgba(255,255,255,0.7)">You've been invited as a <strong style="color:white">${lbl}</strong>.</p>
  <p style="color:rgba(255,255,255,0.7)">Click below to get started:</p>
  <a href="${inviteUrl}" style="display:inline-block;background:#229EDF;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept invitation</a>
  <p style="color:rgba(255,255,255,0.4);font-size:12px">This invitation expires on ${expiresSafe}. If you didn't expect this, ignore this email.</p>
</div>`.trim();
}

export async function sendInvitationInviteEmail(
  invitation: Invitation
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const resend = new Resend(key);
    const from = process.env.RESEND_FROM_EMAIL ?? "neko@nekoprotocol.xyz";
    await resend.emails.send({
      from,
      to: [invitation.email],
      subject: "You're invited to Neko Protocol",
      html: inviteEmailHtml(invitation),
    });
  } catch {
    // Invitation persisted; email is best-effort
  }
}
