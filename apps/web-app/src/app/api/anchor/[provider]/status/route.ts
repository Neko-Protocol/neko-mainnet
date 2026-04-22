import { NextResponse } from "next/server";
import { isValidProvider } from "@/lib/anchors";

export const dynamic = "force-dynamic";

function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case "etherfuse":
      return Boolean(
        process.env.ETHERFUSE_API_KEY && process.env.ETHERFUSE_BASE_URL
      );
    case "alfredpay":
      return Boolean(
        process.env.ALFREDPAY_API_KEY &&
        process.env.ALFREDPAY_API_SECRET &&
        process.env.ALFREDPAY_BASE_URL
      );
    default:
      return false;
  }
}

/**
 * GET /api/anchor/[provider]/status
 * Returns provider configuration availability for UI gating.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: `Invalid provider: ${provider}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    provider,
    configured: isProviderConfigured(provider),
  });
}
