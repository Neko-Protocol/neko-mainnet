"use client";

import { useState } from "react";
import { Copy, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { stellarNetwork } from "@/lib/config/stellar.config";

interface MultisigPendingModalProps {
  open: boolean;
  onClose: () => void;
  hash: string;
  action: "deposit" | "withdraw";
  amount: string;
  assetSymbol: string;
}

function getStellarExpertTxUrl(hash: string): string {
  const network = stellarNetwork === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

export function MultisigPendingModal({
  open,
  onClose,
  hash,
  action,
  amount,
  assetSymbol,
}: MultisigPendingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const shortHash = `${hash.slice(0, 8)}…${hash.slice(-8)}`;
  const actionLabel = action === "deposit" ? "Deposit" : "Withdrawal";

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15">
                <CheckCircle2 size={20} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Sent to Lobstr Vault
                </h2>
                <p className="text-xs text-white/50">
                  Waiting for co-signer approval
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-white/50">{actionLabel}</span>
              <span className="font-medium text-white">
                {amount} {assetSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Hash</span>
              <button
                type="button"
                onClick={copyHash}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-white/80 transition-colors hover:text-white"
              >
                {shortHash}
                <Copy size={12} />
                {copied && (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                    copied
                  </span>
                )}
              </button>
            </div>
          </div>

          <p className="mb-5 text-xs leading-relaxed text-white/60">
            Open the{" "}
            <span className="font-medium text-white/85">Lobstr Vault</span> app
            on your co-signers&apos; devices to review and approve. Once the
            multisig threshold is met, your transaction will execute
            automatically. You can close this window — we&apos;ll update your
            balance when it confirms.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="https://vault.lobstr.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#229EDF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f8ec9]"
            >
              Open Lobstr Vault
              <ExternalLink size={14} />
            </a>
            <a
              href={getStellarExpertTxUrl(hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              Stellar Expert
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
