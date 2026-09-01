"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";
import { BackendError } from "@/lib/services/backend-client";
import { useClaimReferral } from "../hooks/useClaimReferral";
import type { ReferredBy } from "../services/referrals.service";

export interface ReferralCodeClaimProps {
  referredBy: ReferredBy | null;
}

/** "Have a code?" — either the claim form, or the locked-in code once one
 * is already attributed (a wallet can only ever have one). */
export function ReferralCodeClaim({ referredBy }: ReferralCodeClaimProps) {
  const t = useTranslations("sharedReferral.settings");
  const errorMessage = useApiErrorMessage();
  const { addNotification } = useToast();
  const claim = useClaimReferral();
  const [codeDraft, setCodeDraft] = useState("");

  function handleApply() {
    const code = codeDraft.trim();
    if (!code) return;
    claim.mutate(code, {
      onSuccess: () => {
        addNotification(t("appliedToast"), "success");
        setCodeDraft("");
      },
      onError: (err) => {
        addNotification(
          errorMessage(err instanceof BackendError ? err.code : undefined),
          "error"
        );
      },
    });
  }

  return (
    <div className="mt-1 border-t border-white/5 pt-4">
      <span className="mb-2 block text-xs text-white/40">{t("haveCode")}</span>
      {referredBy ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#2A2A2A] px-4 py-3">
          <span className="font-mono text-sm text-white/80">
            {referredBy.code}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              referredBy.status === "confirmed"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {t(
              referredBy.status === "confirmed"
                ? "statusConfirmed"
                : "statusPending"
            )}
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
            placeholder={t("codePlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#229EDF]"
          />
          <button
            type="button"
            disabled={!codeDraft.trim() || claim.isPending}
            onClick={handleApply}
            className="shrink-0 rounded-xl bg-[#229EDF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e8bc9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claim.isPending ? t("applying") : t("apply")}
          </button>
        </div>
      )}
    </div>
  );
}
