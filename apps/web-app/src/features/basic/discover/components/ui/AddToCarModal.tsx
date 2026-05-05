"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { BasicBuyForm, type BuyConfirmPayload } from "./BasicBuyForm";
import { useCarStore } from "@/stores/car.store";
import { ASSET_INFO } from "@/features/shared/discover/utils/assetInfo";
import { getAssetsConfig } from "@/lib/constants/assets.config";

interface AddToCarModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToCarModal({ symbol, isOpen, onClose }: AddToCarModalProps) {
  const addItem = useCarStore((s) => s.addItem);

  if (!isOpen) return null;

  const staticInfo = ASSET_INFO[symbol];
  const assetCfg = getAssetsConfig()[symbol];
  const displayName = staticInfo?.name ?? assetCfg?.name ?? symbol;
  const logoSrc = staticInfo?.logo ?? assetCfg?.icon;

  const handleConfirm = (payload: BuyConfirmPayload) => {
    addItem({
      symbol,
      paymentToken: payload.paymentToken,
      paymentAmount: payload.paymentAmount,
      estimatedReceive: payload.estimatedReceive,
    });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1C1C1C] shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              {logoSrc && (
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white ring-1 ring-white/10">
                  <Image
                    src={logoSrc}
                    alt={displayName}
                    fill
                    unoptimized
                    className="object-cover scale-110"
                  />
                </div>
              )}
              <div>
                <p className="text-white font-bold text-base leading-tight">
                  {symbol}
                </p>
                <p className="text-white/40 text-xs">{displayName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <BasicBuyForm
            symbol={symbol}
            confirmLabel="Add to car"
            onConfirm={handleConfirm}
          />
        </div>
      </div>
    </ModalPortal>
  );
}
