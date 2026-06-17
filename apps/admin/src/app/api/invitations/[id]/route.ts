import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { acceptInvitation, deleteInvitation } from "@/lib/invitations";
import { requireAdminSession } from "@/lib/require-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const accepted_notes =
    typeof b.accepted_notes === "string"
      ? b.accepted_notes.trim() || null
      : null;
  const volume_moved =
    b.volume_moved !== null &&
    b.volume_moved !== undefined &&
    Number.isFinite(Number(b.volume_moved))
      ? Number(b.volume_moved)
      : null;

  const updated = await acceptInvitation(id, { accepted_notes, volume_moved });
  if (!updated) {
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteInvitation(id);
  return NextResponse.json({ ok: true });
}
