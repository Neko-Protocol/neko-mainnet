"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Users, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useReferralStats } from "../hooks/useReferralStats";

interface ReferEarnModalProps {
  open: boolean;
  onClose: () => void;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function referralLink(code: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?ref=${code}`;
}

export function ReferEarnModal({ open, onClose }: ReferEarnModalProps) {
  const [copied, setCopied] = useState(false);
  const { data, isPending } = useReferralStats();

  if (!open) return null;

  const link = data?.code ? referralLink(data.code) : null;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

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
              <div>
                <h2 className="text-lg font-semibold text-white">Referrals</h2>
                <p className="text-xs text-white/50">
                  Invite friends to Neko with your personal link
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

          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
              Your referral link
            </p>
            {isPending || !link ? (
              <div className="h-9 animate-pulse rounded-lg bg-white/5" />
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2">
                <span className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-white/85 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {link}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-1.5 text-white/60 transition-colors hover:text-white"
                >
                  <Copy size={13} />
                  {copied && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                      copied
                    </span>
                  )}
                </button>
              </div>
            )}

            {link && (
              <div className="mt-3 flex gap-1">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on @NekoProto! Use my referral link: ${link}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  Share on
                  <Image
                    src="/assets/social-logos/x-logo.png"
                    alt="X"
                    width={13}
                    height={13}
                  />
                </a>
              </div>
            )}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-white/50">
                <Users size={13} />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  Referred
                </span>
              </div>
              <p className="text-lg font-semibold text-white">
                {data?.referred_confirmed ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/50">
                Swap volume
              </p>
              <p className="text-lg font-semibold text-white">
                {formatUsd(data?.swap_volume_usd ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/50">
                Vault TVL
              </p>
              <p className="text-lg font-semibold text-white">
                {formatUsd(data?.vault_tvl_usd ?? 0)}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-white/60">
            A referral counts once the person you invited connects a wallet and
            verifies their email. Their swap volume and vault deposits are
            tracked to your link.
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}
