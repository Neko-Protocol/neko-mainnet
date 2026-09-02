"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/SectionCard";
import { ReadonlyRow } from "@/components/ui/ReadonlyRow";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useReferralStats } from "../hooks/useReferralStats";
import { referralLink } from "../utils/referralLink";
import { ReferralStatsGrid } from "./ReferralStatsGrid";
import { ReferralCodeClaim } from "./ReferralCodeClaim";

const TITLE_CLASSNAME =
  "text-base font-semibold uppercase tracking-widest text-white";

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
  const { data, isPending, isError } = useReferralStats();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(key: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }

  if (!isConnected) {
    return (
      <SectionCard
        title={t("title")}
        titleClassName={TITLE_CLASSNAME}
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
      titleClassName={TITLE_CLASSNAME}
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      {isError ? (
        <p className="text-sm text-white/40">{t("loadError")}</p>
      ) : isPending || !data ? (
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

          <ReferralStatsGrid
            referredConfirmed={data.referred_confirmed}
            purchasesSwapsUsd={data.swap_volume_usd}
            vaultTvlUsd={data.vault_tvl_usd}
          />

          <ReferralCodeClaim referredBy={data.referred_by} />
        </>
      )}
    </SectionCard>
  );
}
