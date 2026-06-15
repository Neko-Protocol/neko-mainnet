"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { useStellarWallet } from "@neko/stellar-wallet";
import { AdminWalletButton } from "@/components/AdminWalletButton";
import {
  getActivation,
  prepareActivationPayout,
  prepareBatchActivationPayout,
  cancelActivationPayout,
  submitActivationPayout,
  submitBatchActivationPayout,
  sendActivationInvites,
  type ActivationDetail,
  type Participant,
  type ParticipantStatus,
} from "@/lib/activations";

const STATUS_BADGE: Record<ParticipantStatus, string> = {
  pending: "bg-white/10 text-white/55",
  payable: "bg-amber-400/15 text-amber-300",
  paying: "bg-[#229EDF]/15 text-[#229EDF]",
  paid: "bg-emerald-400/15 text-emerald-300",
};

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function stellarExpertTxUrl(hash: string): string {
  const network =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase() ===
      "PUBLIC" ||
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase() ===
      "MAINNET"
      ? "public"
      : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function activationPdfFilename(activation: ActivationDetail): string {
  const slug =
    activation.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || activation.id;
  return `activation-${slug}.pdf`;
}

export default function ActivationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const wallet = useStellarWallet();

  const [activation, setActivation] = useState<ActivationDetail | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getActivation(id);
        if (cancelled) return;
        setActivation(data);
        setExpired(new Date(data.expires_at).getTime() < Date.now());
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function pay(participant: Participant) {
    if (!wallet.address) {
      setPayError("Connect a wallet to pay rewards.");
      return;
    }
    setPayError(null);
    setPayingId(participant.id);
    try {
      const prepared = await prepareActivationPayout({
        participant_id: participant.id,
        admin_wallet: wallet.address,
      });

      let signedXdr: string;
      try {
        signedXdr = await wallet.signTransaction(prepared.xdr, {
          networkPassphrase: prepared.network_passphrase,
        });
      } catch (signErr) {
        await cancelActivationPayout({ participant_id: participant.id }).catch(
          () => undefined
        );
        throw signErr;
      }

      await submitActivationPayout({
        participant_id: participant.id,
        signed_xdr: signedXdr,
      });
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Payment failed, try again."
      );
    } finally {
      setPayingId(null);
      refresh();
    }
  }

  async function payAll() {
    if (!wallet.address) {
      setPayError("Connect a wallet to pay rewards.");
      return;
    }
    if (!activation) return;

    setPayingAll(true);
    setPayError(null);
    try {
      let remaining = 1;
      while (remaining > 0) {
        const prepared = await prepareBatchActivationPayout({
          activation_id: activation.id,
          admin_wallet: wallet.address,
        });

        if (!prepared.participant_ids.length) break;

        let signedXdr: string;
        try {
          signedXdr = await wallet.signTransaction(prepared.xdr, {
            networkPassphrase: prepared.network_passphrase,
          });
        } catch {
          break;
        }

        await submitBatchActivationPayout({
          activation_id: activation.id,
          participant_ids: prepared.participant_ids,
          signed_xdr: signedXdr,
        });

        remaining = prepared.remaining_payable;
      }
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Batch payment failed, try again."
      );
    } finally {
      setPayingAll(false);
      refresh();
    }
  }

  async function downloadPdf() {
    if (!activation) return;
    setPayError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const participants = activation.participants;
      const payable = participants.filter((p) => p.status === "payable").length;
      const paid = participants.filter((p) => p.status === "paid");
      const paidCount = paid.length;
      const totalPaidXlm = paid.reduce(
        (sum, p) => sum + (p.paid_amount_xlm ?? activation.reward_xlm),
        0
      );

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(activation.name, 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${activation.reward_xlm} XLM per participant`, 14, 26);
      doc.text(`Expires ${formatDateTime(activation.expires_at)}`, 14, 32);
      doc.text(`Generated ${formatDateTime(new Date().toISOString())}`, 14, 38);
      doc.setTextColor(0);
      doc.text(
        `Participants: ${participants.length} · Payable: ${payable} · Paid: ${paidCount} · Total paid: ${totalPaidXlm} XLM`,
        14,
        46
      );

      const txColumnIndex = 5;
      autoTable(doc, {
        startY: 52,
        head: [
          ["Email", "Status", "Wallet", "Amount", "Paid At", "Transaction"],
        ],
        body: participants.map((p) => [
          p.email,
          p.status,
          p.matched_wallet ? truncate(p.matched_wallet) : "-",
          p.paid_amount_xlm != null ? String(p.paid_amount_xlm) : "-",
          p.paid_at ? formatDateTime(p.paid_at) : "-",
          p.paid_tx_hash ? truncate(p.paid_tx_hash) : "-",
        ]),
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
          doc.link(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            { url: stellarExpertTxUrl(participant.paid_tx_hash) }
          );
        },
      });

      doc.save(activationPdfFilename(activation));
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Failed to generate PDF."
      );
    }
  }

  async function resendInvites() {
    if (!activation) return;
    setInviteStatus(null);
    try {
      const { sent } = await sendActivationInvites(activation.id);
      setInviteStatus(`Sent ${sent} invites`);
    } catch (err) {
      setInviteStatus(
        err instanceof Error ? err.message : "Failed to send invites"
      );
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!activation) {
    return <p className="p-6 text-sm text-white/50 lg:p-8">Loading…</p>;
  }

  const payableCount = activation.participants.filter(
    (p) => p.status === "payable"
  ).length;
  const paidCount = activation.participants.filter(
    (p) => p.status === "paid"
  ).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/activations"
          className="text-sm text-[#229EDF] hover:underline"
        >
          ← Back to activations
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {activation.name}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {activation.reward_xlm} XLM per participant ·{" "}
              {expired ? "Expired" : "Expires"}{" "}
              {new Date(activation.expires_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {" · "}
              {payableCount + paidCount} / {activation.participants.length}{" "}
              completed · {payableCount} payable · {paidCount} paid
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadPdf()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/80 transition hover:bg-white/5"
            >
              <Download className="size-3.5" aria-hidden />
              Download PDF
            </button>
            {payableCount > 0 && wallet.address ? (
              <button
                type="button"
                onClick={() => void payAll()}
                disabled={payingAll || payingId !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
              >
                {payingAll
                  ? "Paying all…"
                  : `Pay all (${payableCount} · ${payableCount * activation.reward_xlm} XLM)`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void resendInvites()}
              className="text-xs text-white/50 transition hover:text-white"
            >
              Resend invites
            </button>
            {inviteStatus ? (
              <span className="text-xs text-white/45">{inviteStatus}</span>
            ) : null}
            <AdminWalletButton
              address={wallet.address}
              connecting={wallet.connecting}
              onConnect={() => void wallet.connect().catch(() => undefined)}
              onDisconnect={() => void wallet.disconnect()}
            />
          </div>
        </div>
      </div>

      {payError ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {payError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#1C1C1C]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-white/45">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {activation.participants.map((p) => (
              <tr
                key={p.id}
                className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-medium text-white">{p.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_BADGE[p.status]}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/70">
                  {p.matched_wallet ? truncate(p.matched_wallet) : "—"}
                </td>
                <td className="px-4 py-3">
                  {p.paid_tx_hash ? (
                    <a
                      href={stellarExpertTxUrl(p.paid_tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#229EDF] hover:underline"
                    >
                      {p.paid_amount_xlm ?? activation.reward_xlm} XLM
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(p.status === "payable" || p.status === "paying") && (
                    <button
                      type="button"
                      onClick={() => void pay(p)}
                      disabled={
                        !wallet.address || payingId !== null || payingAll
                      }
                      className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
                      title={
                        wallet.address
                          ? undefined
                          : "Connect a wallet to pay rewards"
                      }
                    >
                      {payingId === p.id
                        ? "Paying…"
                        : `Pay ${activation.reward_xlm} XLM`}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
