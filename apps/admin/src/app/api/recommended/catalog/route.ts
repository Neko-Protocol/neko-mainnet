import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { listCatalogDestinations } from "@/lib/recommended-strategies";

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  try {
    const destinations = await listCatalogDestinations();
    return NextResponse.json({ destinations });
  } catch (err) {
    console.error("[recommended/catalog]", err);
    return NextResponse.json({ destinations: [] });
  }
}
