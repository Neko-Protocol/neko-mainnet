"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useWalletType } from "@/hooks/useWalletType";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useNavItems } from "@/hooks/useNavItems";
import { SidebarLogo } from "./SidebarLogo";
import { NavItem } from "./NavItem";
import { ConnectedCard } from "./ConnectedCard";
import { SetupCard } from "./SetupCard";
import { LanguageSelector } from "./LanguageSelector";

export const SIDEBAR_WIDTH = "270px";

export function Sidebar() {
  const pathname = usePathname();
  const { isStellarConnected, stellarAddress } = useWalletType();
  const { disconnect: disconnectStellar } = useStellarWallet();

  const navItems = useNavItems();
  const isConnected = isStellarConnected;
  const activeAddress = stellarAddress ?? "";

  const handleDisconnect = () => {
    void disconnectStellar();
  };

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[270px] flex-col border-r border-white/5 bg-[#121212]">
      <SidebarLogo />

      <nav className="flex flex-1 flex-col gap-1 px-3 min-h-0 overflow-y-auto">
        {navItems.map(({ label, href, icon }) => (
          <NavItem
            key={href}
            label={label}
            href={href}
            icon={icon}
            isActive={isActive(href)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-3 p-4 pt-6 overflow-visible">
        {isConnected && activeAddress ? (
          <ConnectedCard
            address={activeAddress}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <SetupCard />
        )}
        <LanguageSelector embedded />
      </div>
    </aside>
  );
}
