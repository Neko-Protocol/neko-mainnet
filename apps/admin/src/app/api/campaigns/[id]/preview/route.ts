import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCampaign } from "@/lib/campaigns";
import { requireAdminSession } from "@/lib/require-admin";
import { getSegmentRecipients, isSegmentId } from "@/lib/segments";

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const first = local.slice(0, 1).toLowerCase();
  return `${first}***@${domain}`;
}

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

  const segmentId = isSegmentId(campaign.segment) ? campaign.segment : null;
  if (!segmentId) {
    return NextResponse.json({ count: 0, sample: [] as string[] });
  }

  const recipients = await getSegmentRecipients(segmentId);
  const sample = recipients.slice(0, 5).map((r) => maskEmail(r.email));

  return NextResponse.json({
    count: recipients.length,
    sample,
  });
}
