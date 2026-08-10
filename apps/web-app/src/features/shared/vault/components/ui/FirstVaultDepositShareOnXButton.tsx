"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { generateVaultDepositShareIntentUrl } from "@/lib/share";
import { cn } from "@/lib/utils";

export type FirstVaultDepositShareOnXButtonProps = {
  vaultName: string;
  apy: string;
  className?: string;
};

/**
 * Opens the X composer with first-vault-deposit copy (vault name + APY only; never $).
 */
export function FirstVaultDepositShareOnXButton({
  vaultName,
  apy,
  className,
}: FirstVaultDepositShareOnXButtonProps) {
  const t = useTranslations("sharedVault.shareOnX");
  const handleClick = useCallback(() => {
    const url = generateVaultDepositShareIntentUrl({ vaultName, apy });
    window.open(url, "_blank", "noopener,noreferrer");
  }, [vaultName, apy]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-black px-4 py-3 text-sm font-semibold text-white transition-colors duration-150",
        "hover:bg-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/80",
        className
      )}
    >
      {t("button")}
    </button>
  );
}
