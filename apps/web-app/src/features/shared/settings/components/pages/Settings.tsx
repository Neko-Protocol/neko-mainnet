"use client";

import React from "react";
import { Wallet, Mail, Sliders, LayoutGrid, Network } from "lucide-react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { SettingsWalletSection } from "../ui/SettingsWalletSection";
import { SettingsNetworkSection } from "../ui/SettingsNetworkSection";
import { SettingsPreferencesSection } from "../ui/SettingsPreferencesSection";
import { SettingsUIModeSection } from "../ui/SettingsUIModeSection";
import { SettingsEmailSection } from "../ui/SettingsEmailSection";

type SectionId = "wallet" | "email" | "preferences" | "uiMode" | "network";

const TABS: { id: SectionId; label: string; Icon: React.ElementType }[] = [
  { id: "preferences", label: "Preferences", Icon: Sliders },
  { id: "uiMode", label: "App Mode", Icon: LayoutGrid },
  { id: "email", label: "Email", Icon: Mail },
  { id: "wallet", label: "Wallet", Icon: Wallet },
  { id: "network", label: "Network", Icon: Network },
];

export default function Settings() {
  const { copy, copiedKey } = useCopyToClipboard({ showNotification: true });
  const [active, setActive] = React.useState<SectionId>("preferences");

  return (
    <PageContainer maxWidth="4xl">
      <BannerPage
        title="Settings"
        subtitle="Manage preferences and configuration."
        badge="Configuration"
        imageSrc="/banners/settings.svg"
        imageAlt="Settings  illustration"
        imagePosition="bottom-right"
        className="mb-6"
      />

      <div className="mb-4 flex justify-center">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-[#1C1C1C] p-1.5"
        >
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {active === "wallet" && (
          <SettingsWalletSection
            copy={copy}
            copiedKey={copiedKey}
            icon={Wallet}
            open
          />
        )}
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
      </div>
    </PageContainer>
  );
}
