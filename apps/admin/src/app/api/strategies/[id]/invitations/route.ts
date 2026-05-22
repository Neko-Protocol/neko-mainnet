import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createInvitation,
  isInvitationType,
  listInvitations,
  markExpired,
} from "@/lib/invitations";
import { parseInvitationPostBody } from "@/lib/create-invitation-request";
import { sendInvitationInviteEmail } from "@/lib/invitation-mail";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  await markExpired();

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const sp = request.nextUrl.searchParams;
  const filters: {
    strategy_id: string;
    status?: string;
    type?: string;
  } = { strategy_id: id };

  const status = sp.get("status");
  if (status === "pending" || status === "accepted" || status === "expired") {
    filters.status = status;
  }

  const type = sp.get("type");
  if (type && isInvitationType(type)) filters.type = type;

  const rows = await listInvitations(filters);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  await markExpired();

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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
  const parsed = parseInvitationPostBody(b);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!isInvitationType(parsed.type)) {
    return NextResponse.json(
      { error: "Invalid invitation type" },
      { status: 400 }
    );
  }

  const invitation = await createInvitation({
    email: parsed.email,
    type: parsed.type,
    assigned_to: parsed.assigned_to,
    notes: parsed.notes ?? null,
    created_by: "admin",
    expires_days: parsed.expires_days,
    strategy_id: id,
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  await sendInvitationInviteEmail(invitation);

  return NextResponse.json(invitation);
}
