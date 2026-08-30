import { NextRequest, NextResponse } from "next/server";
import { ErrorCode } from "@neko/api-contracts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * JSON-RPC entry point for the browser.
 *
 * `NEXT_PUBLIC_STELLAR_RPC_URL` points here, so the ~20 files that construct
 * an `rpc.Server` keep working unchanged while provider credentials stay on
 * the server. The backend holds the endpoint pool and the API keys; this route
 * only carries the internal key, which never reaches the client bundle.
 *
 * The honest limit of what can be enforced here: anything the browser can do,
 * someone reading the app's JavaScript can also do. These checks make abuse
 * expensive and visible rather than impossible — which is why the throttle on
 * the backend and the D1.3 metrics are part of the defence, not extras.
 */

/** A JSON-RPC call is small; anything larger is not our client. */
const MAX_BODY_BYTES = 100_000;

function reject(code: string, status: number, message?: string) {
  return NextResponse.json({ code, message }, { status });
}

/**
 * Rejects requests that did not come from our own pages.
 *
 * Not a security boundary on its own — a header is trivially forged — but it
 * filters opportunistic abuse, and a browser cannot forge `Origin` on a
 * cross-site request, so it does stop the case where another site tries to
 * use this endpoint through a visitor.
 */
function isSameOrigin(req: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true; // Unset in local dev; nothing to compare against.

  let expected: string;
  try {
    expected = new URL(appUrl).origin;
  } catch {
    return true;
  }

  const origin = req.headers.get("origin");
  if (origin) return origin === expected;

  // Same-origin fetches may omit Origin; fall back to Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }

  // Neither header present, which no browser does on a cross-site request:
  // CORS requires Origin on any fetch sending JSON. So what lands here is a
  // non-browser client — including our own server-side code, which routes
  // through this gateway because the SDKs it hands off to (SwapKit among
  // them) accept a URL and no headers, leaving them no way to authenticate.
  //
  // Rejecting these would break our own traffic while stopping nothing: a
  // scripted caller can set Origin with one flag. The guarantee worth keeping
  // is the one a browser cannot forge — a mismatched Origin — and that is
  // enforced above. Abuse is bounded by the method allowlist, the batch and
  // body caps, and the backend throttle.
  return true;
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    return reject(ErrorCode.BACKEND_PROXY_MISCONFIGURED, 500);
  }

  if (!isSameOrigin(req)) {
    return reject(
      ErrorCode.UNAUTHORIZED,
      403,
      "Requests must originate from the app."
    );
  }

  const body = await req.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) {
    return reject(
      ErrorCode.VALIDATION_ERROR,
      413,
      "JSON-RPC payload too large."
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": key,
        ...forwardedRequestId(req),
      },
      body,
      cache: "no-store",
    });
  } catch {
    return reject(ErrorCode.BACKEND_UNREACHABLE, 502);
  }

  // Pass the body through untouched: the caller is a Stellar SDK client that
  // parses the JSON-RPC envelope itself, including error envelopes.
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function forwardedRequestId(req: NextRequest): Record<string, string> {
  const id = req.headers.get("x-request-id");
  return id ? { "X-Request-Id": id } : {};
}
