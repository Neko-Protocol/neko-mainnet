"use client";

import React from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { SettingsWalletSection } from "../ui/SettingsWalletSection";
import { SettingsNetworkSection } from "../ui/SettingsNetworkSection";
import { SettingsPreferencesSection } from "../ui/SettingsPreferencesSection";
import { SettingsUIModeSection } from "../ui/SettingsUIModeSection";
import { SettingsEmailSection } from "../ui/SettingsEmailSection";

export default function Settings() {
  const { copy, copiedKey } = useCopyToClipboard({ showNotification: true });

  return (
    <PageContainer maxWidth="6xl">
      <BannerPage
        title="Settings"
        subtitle="Manage your wallet connection and inspect the current network configuration."
        badge="Configuration"
        imageSrc="/banners/settings.svg"
        imageAlt="Settings illustration"
        className="mb-8"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 lg:h-full">
          <div className="lg:flex-1">
            <SettingsWalletSection copy={copy} copiedKey={copiedKey} />
          </div>
          <div>
            <SettingsEmailSection />
          </div>
          <div className="lg:flex-1">
            <SettingsPreferencesSection />
          </div>
          <div>
            <SettingsUIModeSection />
          </div>
        </div>
        <div className="lg:h-full">
          <SettingsNetworkSection copy={copy} copiedKey={copiedKey} />
        </div>
      </div>
    </PageContainer>
  );
}
