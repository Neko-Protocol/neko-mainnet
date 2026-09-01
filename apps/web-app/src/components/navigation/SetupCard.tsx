"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useReferralStore } from "@/features/shared/referral/stores/referral.store";
import { CARD_STYLES, CARD_BUTTON_STYLES } from "./sidebarConfig";

export function SetupCard() {
  const t = useTranslations("common.wallet");
  const { connect } = useStellarWallet();
  const refCode = useReferralStore((s) => s.refCode);
  const setRefCode = useReferralStore((s) => s.setRefCode);

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");

  function handleConnect() {
    const trimmed = codeDraft.trim();
    if (trimmed) setRefCode(trimmed);
    void connect();
  }

  return (
    <div className={CARD_STYLES}>
      <p className="mb-6 text-base font-bold leading-snug text-black">
        {t("connectToGetStarted")}
      </p>
      <button
        type="button"
        onClick={handleConnect}
        className={CARD_BUTTON_STYLES}
      >
        {t("connectAccount")}
        <ArrowRight className="h-4 w-4 shrink-0" />
      </button>

      {showCodeInput ? (
        <input
          type="text"
          autoFocus
          value={codeDraft}
          onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
          placeholder={t("referralCodePlaceholder")}
          className="mt-3 w-full rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm font-semibold text-black placeholder:text-black/30 outline-none focus:border-black/40"
        />
      ) : refCode ? (
        <p className="mt-3 text-xs font-semibold text-black/50">
          {t("referralCodeApplied", { code: refCode })}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setShowCodeInput(true)}
          className="mt-3 text-xs font-semibold text-black/50 underline underline-offset-2 hover:text-black/70"
        >
          {t("haveReferralCode")}
        </button>
      )}
    </div>
  );
}
