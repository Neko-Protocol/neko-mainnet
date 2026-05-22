import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createStrategy,
  isStrategyType,
  listStrategies,
} from "@/lib/strategies";
import { type StrategyStatus, isStrategyStatus } from "@/lib/strategies-schema";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const rows = await listStrategies();
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
  const descriptionRaw =
    typeof b.description === "string" ? b.description.trim() : null;
  const description =
    descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;

  const typeRaw = typeof b.type === "string" ? b.type.trim() : "";
  let target_count = Number(b.target_count);
  if (!Number.isFinite(target_count)) target_count = 0;
  target_count = Math.max(0, Math.floor(target_count));

  const assigned_raw =
    typeof b.assigned_to === "string" ? b.assigned_to.trim() : "";
  const assigned_to = assigned_raw.length > 0 ? assigned_raw : null;

  const statusRaw =
    typeof b.status === "string" ? b.status.trim().toLowerCase() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!isStrategyType(typeRaw)) {
    return NextResponse.json(
      { error: "Invalid strategy type" },
      { status: 400 }
    );
  }

  let statusParse: StrategyStatus | undefined = undefined;
  if (statusRaw && isStrategyStatus(statusRaw)) {
    statusParse = statusRaw;
  }

  const strategy = await createStrategy({
    name,
    description,
    type: typeRaw,
    target_count,
    assigned_to,
    created_by: "admin",
    status: statusParse,
  });

  if (!strategy) {
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    );
  }

  return NextResponse.json(strategy);
}
