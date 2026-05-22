import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteStrategy, getStrategy, updateStrategy } from "@/lib/strategies";
import { isStrategyStatus, isStrategyType } from "@/lib/strategies-schema";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const strategy = await getStrategy(id);
  if (!strategy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(strategy);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

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
  const patch: Parameters<typeof updateStrategy>[1] = {};

  if (typeof b.name === "string") patch.name = b.name;
  if (b.description !== undefined) {
    if (typeof b.description === "string") {
      const t = b.description.trim();
      patch.description = t.length > 0 ? t : null;
    } else if (b.description === null) {
      patch.description = null;
    }
  }
  if (typeof b.type === "string") {
    if (!isStrategyType(b.type)) {
      return NextResponse.json(
        { error: "Invalid strategy type" },
        { status: 400 }
      );
    }
    patch.type = b.type;
  }
  if (b.target_count !== undefined) {
    let n = Number(b.target_count);
    if (!Number.isFinite(n)) n = 0;
    patch.target_count = Math.max(0, Math.floor(n));
  }
  if (typeof b.status === "string") {
    const s = b.status.trim().toLowerCase();
    if (!isStrategyStatus(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = s;
  }
  if (b.assigned_to !== undefined) {
    const r = typeof b.assigned_to === "string" ? b.assigned_to.trim() : null;
    patch.assigned_to = r?.length ? r : null;
  }

  await updateStrategy(id, patch);
  return NextResponse.json({ ok: true });
}

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

  await deleteStrategy(id);
  return NextResponse.json({ ok: true });
}
