"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useStellarWallet } from "@neko/stellar-wallet";
import { AdminWalletButton } from "@/components/AdminWalletButton";

type ParticipantStatus = "pending" | "payable" | "paying" | "paid";

interface Participant {
  id: string;
  email: string;
  status: ParticipantStatus;
  matched_wallet: string | null;
  matched_at: string | null;
  paid_tx_hash: string | null;
  paid_by: string | null;
  paid_at: string | null;
  paid_amount_xlm: number | null;
}

interface ActivationDetail {
  id: string;
  name: string;
  reward_xlm: number;
  expires_at: string;
  created_at: string;
  participants: Participant[];
}

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

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  } & Record<string, unknown>;
  if (!res.ok) {
    throw new Error(payload.message ?? payload.code ?? "Request failed");
  }
  return payload;
}

export default function ActivationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const wallet = useStellarWallet();

  const [activation, setActivation] = useState<ActivationDetail | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/backend/v1/activations/${id}`);
        if (!res.ok) throw new Error("Failed to load activation");
        const data = (await res.json()) as ActivationDetail;
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
      const prepared = (await postJson(
        "/api/backend/v1/activations/payouts/prepare",
        { participant_id: participant.id, admin_wallet: wallet.address }
      )) as { xdr: string; network_passphrase: string };

      let signedXdr: string;
      try {
        signedXdr = await wallet.signTransaction(prepared.xdr, {
          networkPassphrase: prepared.network_passphrase,
        });
      } catch (signErr) {
        // Signature rejected or wallet failed: release the payout lock.
        await postJson("/api/backend/v1/activations/payouts/cancel", {
          participant_id: participant.id,
        }).catch(() => undefined);
        throw signErr;
      }

      await postJson("/api/backend/v1/activations/payouts/submit", {
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
          <AdminWalletButton
            address={wallet.address}
            connecting={wallet.connecting}
            onConnect={() => void wallet.connect().catch(() => undefined)}
            onDisconnect={() => void wallet.disconnect()}
          />
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
                      disabled={!wallet.address || payingId !== null}
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
