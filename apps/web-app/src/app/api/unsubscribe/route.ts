import { NextRequest, NextResponse } from "next/server";

/**
 * RFC 8058 one-click unsubscribe endpoint.
 *
 * Resend does not manage opt-outs for `emails.send` (only for its own
 * Audiences/Broadcasts product), so `mailing_opt_outs` stays our source of
 * truth and this endpoint is what the List-Unsubscribe header points at.
 *
 * - POST: what Gmail/Yahoo call for one-click. Must return a blank 200/202.
 * - GET:  what a human clicking the button hits — redirected to the page that
 *         shows a confirmation.
 */

export const dynamic = "force-dynamic";

async function optOut(token: string): Promise<boolean> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    console.error("[unsubscribe] missing backend config");
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/mailing/unsubscribe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": key,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    return res.ok;
  } catch (err) {
    console.error("[unsubscribe] backend call failed:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse(null, { status: 400 });
  }

  const ok = await optOut(token);
  // Mail providers retry on 5xx, so only signal failure when it's worth a retry.
  return new NextResponse(null, { status: ok ? 200 : 502 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const target = new URL("/unsubscribe", request.nextUrl.origin);
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target);
}
