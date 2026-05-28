"use client";

import { ShieldCheck } from "lucide-react";

interface MultisigBannerProps {
  signersCount: number;
  threshold: number;
}

export function MultisigBanner({
  signersCount,
  threshold,
}: MultisigBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm">
      <ShieldCheck
        size={18}
        className="mt-0.5 shrink-0 text-amber-300"
        aria-hidden
      />
      <div className="flex flex-col gap-1 text-amber-100/90">
        <span className="font-semibold text-amber-200">
          Multisig wallet detected ({threshold}-of-{signersCount})
        </span>
        <span className="text-xs leading-relaxed text-amber-100/70">
          After you sign, the transaction will be sent to{" "}
          <span className="font-medium text-amber-100">Lobstr Vault</span> for
          co-signer approval. Allow up to a few minutes for the other signers to
          confirm in the Lobstr Vault mobile app.
        </span>
      </div>
    </div>
  );
}
