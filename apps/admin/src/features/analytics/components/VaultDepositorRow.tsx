"use client";

import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { truncateAddress } from "@/lib/helpers/addressUtils";
import { formatCurrency } from "@/lib/helpers/currency";
import type { VaultDepositor } from "@neko/api-contracts";

export function VaultDepositorRow({
  depositor,
  symbol,
  rank,
}: {
  depositor: VaultDepositor;
  symbol: string;
  rank: number;
}) {
  const { copy, copiedKey } = useCopyToClipboard();
  const isCopied = copiedKey === depositor.wallet;

  return (
    <div className="grid grid-cols-[22px_1fr_auto] items-center gap-3 border-t border-white/5 px-2 py-4 transition-colors first:border-t-0 hover:bg-white/[0.04] sm:grid-cols-[22px_160px_1fr_auto]">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] font-medium text-white/40">
        {rank}
      </span>

      <button
        onClick={() => copy(depositor.wallet, depositor.wallet)}
        className="group flex items-center gap-1.5 text-left text-sm text-white/70 transition-colors hover:text-white"
        title="Copy wallet address"
      >
        <span className="whitespace-nowrap">
          {truncateAddress(depositor.wallet)}
        </span>
        {isCopied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/60" />
        )}
      </button>

      <span className="hidden truncate text-sm text-white/50 sm:block">
        {depositor.email ?? "-"}
      </span>

      <div className="text-right">
        <div className="text-sm font-medium text-white">
          {depositor.amountTokens.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}{" "}
          {symbol}
        </div>
        <div className="text-xs text-white/40">
          {formatCurrency(depositor.balanceUsd)}
        </div>
      </div>
    </div>
  );
}
