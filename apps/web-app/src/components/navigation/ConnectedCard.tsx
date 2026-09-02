"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, LogOut, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { truncateAddress } from "@/lib/utils";
import { CARD_STYLES, CARD_BUTTON_STYLES } from "./sidebarConfig";
import { useCartStore } from "@/features/basic/cart/stores/cart.store";
import { useUIMode } from "@/features/shared/ui-mode/hooks/useUIMode";
import { NotificationCenter } from "@/features/shared/notifications/components/NotificationCenter";

const NETWORK = (
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET"
).toUpperCase();

const IS_TESTNET = NETWORK === "TESTNET";

interface ConnectedCardProps {
  address: string;
  onDisconnect: () => void;
}

export function ConnectedCard({ address, onDisconnect }: ConnectedCardProps) {
  const t = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const cartCount = useCartStore((s) => s.items.length);
  const { isBasic } = useUIMode();

  return (
    <div className={`${CARD_STYLES} relative`}>
      <p className="mb-4 text-base font-bold leading-snug text-black">
        {t("wallet.connectedWith")}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={CARD_BUTTON_STYLES}
      >
        <span className="truncate">{truncateAddress(address)}</span>
        <ArrowRight
          className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <div className="flex flex-col gap-2 rounded-2xl bg-black/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${IS_TESTNET ? "bg-yellow-400" : "bg-green-400"}`}
            />
            <span className="text-xs font-semibold text-black/60">
              {IS_TESTNET ? t("network.testnet") : t("network.mainnet")}
            </span>
          </div>

          <button
            type="button"
            onClick={onDisconnect}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {t("wallet.disconnect")}
          </button>
        </div>
      </div>

      {/* NotificationCenter anchors its tray to this relative wrapper. In
          basic mode the cart moves in from its own floating badge to sit
          beside notifications instead, both icon-only there since they're
          paired; expert mode has notifications alone, so it spells itself
          out. */}
      <div className="relative flex items-stretch gap-2 pt-2">
        {isBasic && (
          <Link
            href="/cart"
            aria-label={
              cartCount > 0
                ? t("nav.cartAriaLabelWithCount", { count: cartCount })
                : t("nav.cartAriaLabel")
            }
            className="relative flex flex-1 items-center justify-center rounded-full bg-[#229EDF] py-3 text-white transition-colors hover:bg-[#1e8bc9]"
          >
            <ShoppingBag className="h-5 w-5 shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#229EDF]">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
        )}
        <NotificationCenter showLabel={!isBasic} />
      </div>
    </div>
  );
}
