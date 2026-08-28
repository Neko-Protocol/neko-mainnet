"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface MultisigBannerProps {
  signersCount: number;
  signersRequired: number;
}

export function MultisigBanner({
  signersCount,
  signersRequired,
}: MultisigBannerProps) {
  const t = useTranslations("sharedVault.multisigBanner");

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm">
      <ShieldCheck
        size={18}
        className="mt-0.5 shrink-0 text-amber-300"
        aria-hidden
      />
      <div className="flex flex-col gap-1 text-amber-100/90">
        <span className="font-semibold text-amber-200">
          {t("detected", { signersRequired, signersCount })}
        </span>
        <span className="text-xs leading-relaxed text-amber-100/70">
          {t.rich("description", {
            lobstr: (chunks) => (
              <span className="font-medium text-amber-100">{chunks}</span>
            ),
          })}
        </span>
      </div>
    </div>
  );
}
