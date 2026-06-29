import type { ActivationDetail } from "./activations";
import { formatDateTime, stellarExpertTxUrl, truncate } from "./stellar-format";

function activationPdfFilename(activation: ActivationDetail): string {
  const slug =
    activation.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || activation.id;
  return `activation-${slug}.pdf`;
}

export async function downloadActivationPdf(
  activation: ActivationDetail
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const participants = activation.participants;
  const payable = participants.filter((p) => p.status === "payable").length;
  const payoutAsset = activation.payout_asset ?? "XLM";
  const rewardAmount = activation.reward_amount ?? activation.reward_xlm;
  const paid = participants.filter((p) => p.status === "paid");
  const paidCount = paid.length;
  const totalPaid = paid.reduce(
    (sum, p) => sum + (p.paid_amount ?? p.paid_amount_xlm ?? rewardAmount),
    0
  );

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(activation.name, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${rewardAmount} ${payoutAsset} per participant`, 14, 26);
  doc.text(`Expires ${formatDateTime(activation.expires_at)}`, 14, 32);
  doc.text(`Generated ${formatDateTime(new Date().toISOString())}`, 14, 38);
  doc.setTextColor(0);
  doc.text(
    `Participants: ${participants.length} · Payable: ${payable} · Paid: ${paidCount} · Total paid: ${totalPaid} ${payoutAsset}`,
    14,
    46
  );

  const txColumnIndex = 5;
  autoTable(doc, {
    startY: 52,
    head: [["Email", "Status", "Wallet", "Amount", "Paid At", "Transaction"]],
    body: participants.map((p) => {
      const amount = p.paid_amount ?? p.paid_amount_xlm;
      const asset = p.paid_asset ?? payoutAsset;
      return [
        p.email,
        p.status,
        p.matched_wallet ? truncate(p.matched_wallet) : "-",
        amount != null ? `${amount} ${asset}` : "-",
        p.paid_at ? formatDateTime(p.paid_at) : "-",
        p.paid_tx_hash ? truncate(p.paid_tx_hash) : "-",
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 158, 223] },
    didDrawCell: (data) => {
      if (
        data.section !== "body" ||
        data.column.index !== txColumnIndex ||
        data.row.index < 0
      ) {
        return;
      }
      const participant = participants[data.row.index];
      if (!participant?.paid_tx_hash) return;
      doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
        url: stellarExpertTxUrl(participant.paid_tx_hash),
      });
    },
  });

  doc.save(activationPdfFilename(activation));
}
