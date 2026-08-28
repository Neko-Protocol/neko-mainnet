"use client";

import React from "react";
import { useTranslations } from "next-intl";

export type VaultTabKey = "vaults" | "positions";

interface VaultTabsProps {
  activeTab: VaultTabKey;
  onChange: (tab: VaultTabKey) => void;
}

export const VaultTabs: React.FC<VaultTabsProps> = ({
  activeTab,
  onChange,
}) => {
  const t = useTranslations("sharedVault.tabs");

  return (
    <div className="flex bg-[#2A2A2A] rounded-xl p-1 gap-1 w-fit">
      <button
        onClick={() => onChange("vaults")}
        className={`py-2 px-3 sm:px-5 rounded-xs sm:rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "vaults"
            ? "bg-[#229EDF] text-white"
            : "text-white/50 hover:text-white/80"
        }`}
      >
        {t("vaults")}
      </button>
      <button
        onClick={() => onChange("positions")}
        className={`py-2 px-3 sm:px-5 rounded-xs sm:rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "positions"
            ? "bg-[#229EDF] text-white"
            : "text-white/50 hover:text-white/80"
        }`}
      >
        {t("positions")}
      </button>
    </div>
  );
};
