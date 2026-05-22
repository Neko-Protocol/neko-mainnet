import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getSegmentCount, isSegmentId } from "@/lib/segments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isSegmentId(id)) {
    return NextResponse.json({ error: "Invalid segment id" }, { status: 400 });
  }

  const count = await getSegmentCount(id);
  return NextResponse.json({ count });
}
