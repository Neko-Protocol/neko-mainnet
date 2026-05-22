import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createInvitation,
  INVITATION_TYPES,
  isInvitationType,
  listInvitations,
  markExpired,
  type Invitation,
} from "@/lib/invitations";
import { requireAdminSession } from "@/lib/require-admin";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

function inviteEmailHtml(invitation: Invitation): string {
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

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  await markExpired();

  const sp = request.nextUrl.searchParams;
  const filters: {
    status?: string;
    type?: string;
    assigned_to?: string;
  } = {};

  const status = sp.get("status");
  if (status === "pending" || status === "accepted" || status === "expired") {
    filters.status = status;
  }

  const type = sp.get("type");
  if (type && isInvitationType(type)) filters.type = type;

  const assignedTo = sp.get("assigned_to");
  if (assignedTo) filters.assigned_to = assignedTo;

  const rows = await listInvitations(filters);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  await markExpired();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const typeRaw = typeof b.type === "string" ? b.type.trim() : "user";

  const assigned_raw =
    typeof b.assigned_to === "string" ? b.assigned_to.trim() : "";
  const assigned_to = assigned_raw.length > 0 ? assigned_raw : null;

  const notes = typeof b.notes === "string" ? b.notes.trim() || null : null;

  let expires_days = Number(b.expires_days);
  if (!Number.isFinite(expires_days)) expires_days = 7;
  if (![7, 14, 30].includes(expires_days)) {
    expires_days = 7;
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Valid email address is required" },
      { status: 400 }
    );
  }

  if (!isInvitationType(typeRaw)) {
    return NextResponse.json(
      { error: "Invalid invitation type" },
      { status: 400 }
    );
  }

  const invitation = await createInvitation({
    email,
    type: typeRaw,
    assigned_to,
    notes: notes ?? null,
    created_by: "admin",
    expires_days,
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL ?? "neko@nekoprotocol.xyz";
      await resend.emails.send({
        from,
        to: [email],
        subject: "You're invited to Neko Protocol",
        html: inviteEmailHtml(invitation),
      });
    } catch {
      // Invitation persisted; email is best-effort
    }
  }

  return NextResponse.json(invitation);
}
