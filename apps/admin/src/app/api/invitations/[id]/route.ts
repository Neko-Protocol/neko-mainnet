import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteInvitation } from "@/lib/invitations";
import { requireAdminSession } from "@/lib/require-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteInvitation(id);
  return NextResponse.json({ ok: true });
}
