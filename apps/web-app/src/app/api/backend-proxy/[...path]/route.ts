import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

async function forward(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    return NextResponse.json(
      { code: "BACKEND_PROXY_MISCONFIGURED" },
      { status: 500 }
    );
  }

  const target = `${baseUrl.replace(/\/+$/, "")}/${pathSegments
    .map(encodeURIComponent)
    .join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "X-Internal-Key": key,
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const accept = req.headers.get("accept");
  if (accept) headers["Accept"] = accept;
  const requestId = req.headers.get("x-request-id");
  if (requestId) headers["X-Request-Id"] = requestId;

  const isReadOnly = req.method === "GET" || req.method === "HEAD";
  const hasBody = !isReadOnly;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      // GET/HEAD: respect upstream Cache-Control. Mutations: never cache.
      cache: isReadOnly ? "default" : "no-store",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNREACHABLE" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!HOP_BY_HOP.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
