"use client";

import React from "react";
import {
  Wallet,
  Mail,
  Sliders,
  LayoutGrid,
  Network,
  LifeBuoy,
  Gift,
  Scale,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useCopyToClipboard } from "@/features/shared/settings/hooks/useCopyToClipboard";
import { ReferralSettingsSection } from "@/features/shared/referral";
import { SettingsWalletSection } from "../ui/SettingsWalletSection";
import { SettingsNetworkSection } from "../ui/SettingsNetworkSection";
import { SettingsPreferencesSection } from "../ui/SettingsPreferencesSection";
import { SettingsUIModeSection } from "../ui/SettingsUIModeSection";
import { SettingsEmailSection } from "../ui/SettingsEmailSection";
import { SettingsSupportSection } from "../ui/SettingsSupportSection";
import { SettingsLegalSection } from "../ui/SettingsLegalSection";

type SectionId =
  | "wallet"
  | "email"
  | "preferences"
  | "uiMode"
  | "referrals"
  | "network"
  | "support"
  | "legal";

const VALID_SECTION_IDS: SectionId[] = [
  "preferences",
  "uiMode",
  "email",
  "wallet",
  "referrals",
  "network",
  "support",
  "legal",
];

const TABS: { id: SectionId; labelKey: string; Icon: React.ElementType }[] = [
  { id: "preferences", labelKey: "tabPreferences", Icon: Sliders },
  { id: "uiMode", labelKey: "tabAppMode", Icon: LayoutGrid },
  { id: "email", labelKey: "tabEmail", Icon: Mail },
  { id: "wallet", labelKey: "tabWallet", Icon: Wallet },
  { id: "referrals", labelKey: "tabReferrals", Icon: Gift },
  { id: "network", labelKey: "tabNetwork", Icon: Network },
  { id: "support", labelKey: "tabSupport", Icon: LifeBuoy },
  { id: "legal", labelKey: "tabLegal", Icon: Scale },
];

export default function Settings() {
  const t = useTranslations("sharedSettings.page");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { copy, copiedKey } = useCopyToClipboard({ showNotification: true });

  const tabParam = searchParams.get("tab") as SectionId | null;
  const [active, setActive] = React.useState<SectionId>(
    tabParam && VALID_SECTION_IDS.includes(tabParam) ? tabParam : "preferences"
  );

  function handleTabChange(id: SectionId) {
    setActive(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "preferences") {
      params.delete("tab");
    } else {
      params.set("tab", id);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <PageContainer maxWidth="7xl">
      <BannerPage
        title={t("bannerTitle")}
        subtitle={t("bannerSubtitle")}
        badge={t("bannerBadge")}
        imageSrc="/banners/settings.svg"
        imageAlt={t("bannerImageAlt")}
        imagePosition="bottom-right"
        imageLayoutClassName="-right-[52px] -top-[51px] h-[132%] w-[97%] opacity-60 sm:right-0 sm:top-0 sm:h-full sm:w-[55%] sm:opacity-100"
        className="mb-8"
      />

      <div className="mb-4 flex justify-center">
        <div
          role="tablist"
          aria-label={t("sectionsAriaLabel")}
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-[#1C1C1C] p-1.5"
        >
          {TABS.map(({ id, labelKey, Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {active === "wallet" && (
          <SettingsWalletSection
            copy={copy}
            copiedKey={copiedKey}
            icon={Wallet}
            open
          />
        )}
        {active === "referrals" && <ReferralSettingsSection icon={Gift} open />}
        {active === "email" && <SettingsEmailSection icon={Mail} open />}
        {active === "preferences" && (
          <SettingsPreferencesSection icon={Sliders} open />
        )}
        {active === "uiMode" && (
          <SettingsUIModeSection icon={LayoutGrid} open />
        )}
        {active === "network" && (
          <SettingsNetworkSection
            copy={copy}
            copiedKey={copiedKey}
            icon={Network}
            open
          />
        )}
        {active === "support" && (
          <SettingsSupportSection icon={LifeBuoy} open />
        )}
        {active === "legal" && <SettingsLegalSection icon={Scale} open />}
      </div>
    </PageContainer>
  );
}
