import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns";
import { requireAdminSession } from "@/lib/require-admin";
import { isSegmentId } from "@/lib/segments";

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;
  return NextResponse.json(await listCampaigns());
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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { name?: unknown }).name !== "string" ||
    typeof (body as { subject?: unknown }).subject !== "string" ||
    typeof (body as { body_html?: unknown }).body_html !== "string"
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const segmentRaw =
    typeof (body as { segment?: unknown }).segment === "string"
      ? (body as { segment: string }).segment
      : "all";

  const segment = isSegmentId(segmentRaw) ? segmentRaw : null;
  if (!segment) {
    return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
  }

  const trimmed = {
    name: (body as { name: string }).name.trim(),
    subject: (body as { subject: string }).subject.trim(),
    body_html: (body as { body_html: string }).body_html,
    segment,
    created_by: "admin",
  };

  if (!trimmed.name || !trimmed.subject) {
    return NextResponse.json(
      { error: "Name and subject are required" },
      { status: 400 }
    );
  }

  const campaign = await createCampaign(trimmed);
  if (!campaign) {
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }

  return NextResponse.json(campaign);
}
