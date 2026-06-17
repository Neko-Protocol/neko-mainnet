import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateCampaignTvl } from "@/lib/campaigns";
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
  const tvl_moved =
    b.tvl_moved !== null &&
    b.tvl_moved !== undefined &&
    Number.isFinite(Number(b.tvl_moved))
      ? Number(b.tvl_moved)
      : null;

  const ok = await updateCampaignTvl(id, tvl_moved);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to update TVL" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
