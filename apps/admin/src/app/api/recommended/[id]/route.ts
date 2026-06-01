import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deleteRecommendedStrategy,
  getRecommendedStrategy,
  isDestinationKind,
  updateRecommendedStrategy,
} from "@/lib/recommended-strategies";
import { requireAdminSession } from "@/lib/require-admin";

function parseNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

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

  const row = await getRecommendedStrategy(id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
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
  const patch: Parameters<typeof updateRecommendedStrategy>[1] = {};

  if (typeof b.name === "string") patch.name = b.name;
  if (b.description !== undefined) {
    if (typeof b.description === "string") {
      const t = b.description.trim();
      patch.description = t.length > 0 ? t : null;
    } else if (b.description === null) {
      patch.description = null;
    }
  }
  if (typeof b.token_code === "string") patch.token_code = b.token_code;
  if (typeof b.destination_kind === "string") {
    if (!isDestinationKind(b.destination_kind)) {
      return NextResponse.json(
        { error: "Invalid destination_kind" },
        { status: 400 }
      );
    }
    patch.destination_kind = b.destination_kind;
  }
  if (typeof b.destination_id === "string") {
    patch.destination_id = b.destination_id;
  }

  const hasStackKind = b.stack_kind !== undefined;
  const hasStackId = b.stack_id !== undefined;
  if (hasStackKind || hasStackId) {
    const kindEmpty =
      b.stack_kind === null ||
      b.stack_kind === undefined ||
      String(b.stack_kind).trim() === "";
    const idEmpty =
      b.stack_id === null ||
      b.stack_id === undefined ||
      String(b.stack_id).trim() === "";

    if (kindEmpty && idEmpty) {
      patch.stack_kind = null;
      patch.stack_id = null;
    } else if (kindEmpty || idEmpty) {
      return NextResponse.json(
        { error: "stack_kind and stack_id must both be set or both empty" },
        { status: 400 }
      );
    } else {
      const kindRaw = String(b.stack_kind).trim();
      if (!isDestinationKind(kindRaw)) {
        return NextResponse.json(
          { error: "Invalid stack_kind" },
          { status: 400 }
        );
      }
      patch.stack_kind = kindRaw;
      patch.stack_id = String(b.stack_id).trim();
    }
  }

  if (b.amount !== undefined) patch.amount = parseNullableNumber(b.amount);
  if (b.snapshot_apy !== undefined) {
    patch.snapshot_apy = parseNullableNumber(b.snapshot_apy);
  }
  if (b.position !== undefined) {
    let n = Number(b.position);
    if (!Number.isFinite(n)) n = 0;
    patch.position = Math.max(0, Math.floor(n));
  }
  if (typeof b.is_active === "boolean") patch.is_active = b.is_active;

  await updateRecommendedStrategy(id, patch);
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

  await deleteRecommendedStrategy(id);
  return NextResponse.json({ ok: true });
}
