import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCampaign, updateCampaign, type Campaign } from "@/lib/campaigns";
import { requireAdminSession } from "@/lib/require-admin";
import { isSegmentId } from "@/lib/segments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (campaign.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft campaigns can be edited" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Partial<
    Pick<Campaign, "name" | "subject" | "body_html" | "segment">
  > = {};

  if ("name" in body && typeof body.name === "string") {
    const v = body.name.trim();
    if (!v)
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    patch.name = v;
  }
  if ("subject" in body && typeof body.subject === "string") {
    const v = body.subject.trim();
    if (!v)
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    patch.subject = v;
  }
  if ("body_html" in body && typeof body.body_html === "string") {
    patch.body_html = body.body_html;
  }
  if ("segment" in body && typeof body.segment === "string") {
    if (!isSegmentId(body.segment)) {
      return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
    }
    patch.segment = body.segment;
  }

  const ok = await updateCampaign(id, patch);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }

  const updated = await getCampaign(id);
  return NextResponse.json(updated);
}
