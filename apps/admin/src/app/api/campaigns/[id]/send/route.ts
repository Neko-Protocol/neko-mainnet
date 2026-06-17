import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getCampaign,
  markCampaignDraftRetry,
  updateCampaignStatus,
} from "@/lib/campaigns";
import { requireAdminSession } from "@/lib/require-admin";
import { getSegmentRecipients, isSegmentId } from "@/lib/segments";

function htmlForRecipient(bodyHtml: string, walletAddress: string): string {
  return bodyHtml.replace(/\{\{\s*wallet_address\s*\}\}/g, walletAddress);
}

export async function POST(
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

  if (campaign.status === "sent") {
    return NextResponse.json({ error: "Already sent" }, { status: 400 });
  }
  if (campaign.status === "sending") {
    return NextResponse.json({ error: "Send in progress" }, { status: 400 });
  }

  if (campaign.status === "failed") {
    await markCampaignDraftRetry(id);
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 400 }
    );
  }

  const segmentId = isSegmentId(campaign.segment) ? campaign.segment : null;
  if (!segmentId) {
    return NextResponse.json(
      { error: "Invalid segment on campaign" },
      { status: 400 }
    );
  }

  const recipients = await getSegmentRecipients(segmentId);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients in this segment" },
      { status: 400 }
    );
  }

  await updateCampaignStatus(id, "sending");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL ?? "neko@nekoprotocol.xyz";
    const chunkSize = 50;

    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const { error } = await resend.batch.send(
        chunk.map((r) => ({
          from,
          to: [r.email],
          subject: campaign.subject,
          html: htmlForRecipient(campaign.body_html, r.wallet_address),
        }))
      );
      if (error) throw new Error(error.message ?? "Resend batch error");
    }

    await updateCampaignStatus(
      id,
      "sent",
      recipients.length,
      new Date().toISOString()
    );

    return NextResponse.json({ ok: true, sent: recipients.length });
  } catch (e) {
    await updateCampaignStatus(id, "failed");
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
