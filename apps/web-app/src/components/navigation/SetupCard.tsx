"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useReferralStore } from "@/features/shared/referral/stores/referral.store";
import { CARD_STYLES, CARD_BUTTON_STYLES } from "./sidebarConfig";

export function SetupCard() {
  const t = useTranslations("common.wallet");
  const { connect } = useStellarWallet();
  const refCode = useReferralStore((s) => s.refCode);

  return (
    <div className={CARD_STYLES}>
      <p className="mb-6 text-base font-bold leading-snug text-black">
        {t("connectToGetStarted")}
      </p>
      <button
        type="button"
        onClick={() => void connect()}
        className={CARD_BUTTON_STYLES}
      >
        {t("connectAccount")}
        <ArrowRight className="h-4 w-4 shrink-0" />
      </button>

      {refCode && (
        <p className="mt-3 text-xs font-semibold text-black/50">
          {t("referralCodeApplied", { code: refCode })}
        </p>
      )}
    </div>
  );
}
