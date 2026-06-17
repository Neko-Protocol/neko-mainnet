import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getStrategyRealVolumeUsd } from "@/lib/strategies";
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

  const real = await getStrategyRealVolumeUsd(id);
  if (real === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ real_volume: real });
}
