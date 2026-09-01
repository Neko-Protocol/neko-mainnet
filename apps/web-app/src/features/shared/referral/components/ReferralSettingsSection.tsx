"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/SectionCard";
import { ReadonlyRow } from "@/components/ui/ReadonlyRow";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useLocaleFormatter } from "@/lib/helpers/useLocaleFormatter";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";
import { useToast } from "@/hooks/useToast";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { BackendError } from "@/lib/services/backend-client";
import { useReferralStats } from "../hooks/useReferralStats";
import { useClaimReferral } from "../hooks/useClaimReferral";
import { referralLink } from "../utils/referralLink";

export interface ReferralSettingsSectionProps {
  open?: boolean;
  onToggle?: () => void;
  icon?: React.ElementType;
}

export function ReferralSettingsSection({
  open,
  onToggle,
  icon,
}: ReferralSettingsSectionProps) {
  const t = useTranslations("sharedReferral.settings");
  const { isConnected } = useStellarWallet();
  const { formatCurrency } = useLocaleFormatter();
  const errorMessage = useApiErrorMessage();
  const { addNotification } = useToast();
  const { data, isPending } = useReferralStats();
  const claim = useClaimReferral();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");

  function copy(key: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }

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

  if (!isConnected) {
    return (
      <SectionCard
        title={t("title")}
        collapsible
        open={open}
        onToggle={onToggle}
        icon={icon}
      >
        <div className="rounded-xl bg-[#2A2A2A] px-4 py-5 text-center">
          <p className="text-sm text-white/40">{t("noWalletConnected")}</p>
        </div>
      </SectionCard>
    );
  }

  const link = data?.code ? referralLink(data.code) : null;

  return (
    <SectionCard
      title={t("title")}
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      {isPending || !data ? (
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <>
          <ReadonlyRow
            label={t("yourCode")}
            value={data.code}
            copyKey="code"
            copyValue={data.code}
            onCopy={copy}
            copiedKey={copiedKey}
            mono
          />
          {link && (
            <ReadonlyRow
              label={t("yourLink")}
              value={link}
              copyKey="link"
              copyValue={link}
              onCopy={copy}
              copiedKey={copiedKey}
              mono={false}
            />
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#2A2A2A] px-3 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
                {t("referred")}
              </p>
              <p className="text-base font-semibold text-white">
                {data.referred_confirmed}
              </p>
            </div>
            <div className="rounded-xl bg-[#2A2A2A] px-3 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
                {t("swapVolume")}
              </p>
              <p className="text-base font-semibold text-white">
                {formatCurrency(
                  data.swap_volume_usd,
                  "USD",
                  SUMMARY_DISPLAY_DECIMALS
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[#2A2A2A] px-3 py-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
                {t("vaultTvl")}
              </p>
              <p className="text-base font-semibold text-white">
                {formatCurrency(
                  data.vault_tvl_usd,
                  "USD",
                  SUMMARY_DISPLAY_DECIMALS
                )}
              </p>
            </div>
          </div>

          <div className="mt-1 border-t border-white/5 pt-4">
            <span className="mb-2 block text-xs text-white/40">
              {t("haveCode")}
            </span>
            {data.referred_by ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#2A2A2A] px-4 py-3">
                <span className="font-mono text-sm text-white/80">
                  {data.referred_by.code}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    data.referred_by.status === "confirmed"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {t(
                    data.referred_by.status === "confirmed"
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
        </>
      )}
    </SectionCard>
  );
}
