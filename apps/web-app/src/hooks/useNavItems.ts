"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { getNavItems } from "@/components/navigation/sidebarConfig";
import { useUIModeStore } from "@/features/shared/ui-mode/stores/ui-mode.store";
import { useWalletType } from "@/hooks/useWalletType";

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_LENDING_ADMIN_ADDRESS ?? "";

export function useNavItems() {
  const t = useTranslations("common.nav");
  const mode = useUIModeStore((s) => s.mode);
  const { stellarAddress } = useWalletType();
  const isAdmin = Boolean(ADMIN_ADDRESS && stellarAddress === ADMIN_ADDRESS);

  return useMemo(
    () =>
      getNavItems(mode, isAdmin).map(({ labelKey, ...item }) => ({
        ...item,
        label: t(labelKey),
      })),
    [mode, isAdmin, t]
  );
}
