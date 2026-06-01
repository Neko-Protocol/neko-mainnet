import { NextRequest, NextResponse } from "next/server";
import { syncDestinationCatalog } from "@/lib/strategies/syncDestinationCatalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncDestinationCatalog();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[strategies/catalog/refresh]", err);
    return NextResponse.json(
      { error: "Failed to sync destination catalog" },
      { status: 500 }
    );
  }
}
