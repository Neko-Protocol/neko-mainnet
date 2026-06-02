import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { DestinationKind } from "@/lib/recommended-strategies-schema";
import {
  createRecommendedStrategy,
  isDestinationKind,
  listRecommendedStrategies,
} from "@/lib/recommended-strategies";
import { requireAdminSession } from "@/lib/require-admin";

function parseNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseStackFields(b: Record<string, unknown>):
  | {
      stack_kind: DestinationKind | null;
      stack_id: string | null;
    }
  | { error: string } {
  const hasKind =
    b.stack_kind !== undefined &&
    b.stack_kind !== null &&
    String(b.stack_kind).trim() !== "";
  const hasId =
    b.stack_id !== undefined &&
    b.stack_id !== null &&
    String(b.stack_id).trim() !== "";

  if (!hasKind && !hasId) {
    return { stack_kind: null, stack_id: null };
  }
  if (!hasKind || !hasId) {
    return { error: "stack_kind and stack_id must both be set or both empty" };
  }

  const kindRaw = String(b.stack_kind).trim();
  if (!isDestinationKind(kindRaw)) {
    return { error: "Invalid stack_kind" };
  }
  return {
    stack_kind: kindRaw,
    stack_id: String(b.stack_id).trim(),
  };
}

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const rows = await listRecommendedStrategies();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

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
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const token_code =
    typeof b.token_code === "string" ? b.token_code.trim() : "";
  const destination_kindRaw =
    typeof b.destination_kind === "string" ? b.destination_kind.trim() : "";
  const destination_id =
    typeof b.destination_id === "string" ? b.destination_id.trim() : "";

  const descriptionRaw =
    typeof b.description === "string" ? b.description.trim() : null;
  const description =
    descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!token_code) {
    return NextResponse.json(
      { error: "token_code is required" },
      { status: 400 }
    );
  }
  if (!isDestinationKind(destination_kindRaw)) {
    return NextResponse.json(
      { error: "Invalid destination_kind" },
      { status: 400 }
    );
  }
  if (!destination_id) {
    return NextResponse.json(
      { error: "destination_id is required" },
      { status: 400 }
    );
  }

  const stackParsed = parseStackFields(b);
  if ("error" in stackParsed) {
    return NextResponse.json({ error: stackParsed.error }, { status: 400 });
  }

  let position = Number(b.position);
  if (!Number.isFinite(position)) position = 0;
  position = Math.max(0, Math.floor(position));

  const is_active = typeof b.is_active === "boolean" ? b.is_active : true;

  const result = await createRecommendedStrategy({
    name,
    description,
    token_code,
    destination_kind: destination_kindRaw,
    destination_id,
    stack_kind: stackParsed.stack_kind,
    stack_id: stackParsed.stack_id,
    amount: parseNullableNumber(b.amount),
    snapshot_apy: parseNullableNumber(b.snapshot_apy),
    position,
    is_active,
    created_by: "admin",
  });

  if (!result.data) {
    return NextResponse.json(
      { error: "Failed to create recommendation", detail: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
