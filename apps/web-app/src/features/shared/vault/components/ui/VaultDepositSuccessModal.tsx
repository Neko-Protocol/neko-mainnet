"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { ShareOnXButton } from "@/components/ShareOnXButton";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MOCK_SHARE_DEFAULTS } from "@/lib/share";

const BANNER_PATH = "/x/X-Banner.png";

interface VaultDepositSuccessModalProps {
  vaultName: string;
  onClose: () => void;
  /** Defaults to mock demo values until deposits mint server-side share IDs */
  amount?: string;
  apy?: string;
  shareId?: string;
}

export function VaultDepositSuccessModal({
  vaultName,
  onClose,
  amount = MOCK_SHARE_DEFAULTS.amount,
  apy = MOCK_SHARE_DEFAULTS.apy,
  shareId = MOCK_SHARE_DEFAULTS.shareId,
}: VaultDepositSuccessModalProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={handleClose}
      >
        <div
          className="relative w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden transition-all duration-220"
          style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(16px) scale(0.97)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            aria-label="Close"
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="flex flex-col items-center px-10 pt-7 pb-6 gap-4">
            {/* Checkmark */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background:
                  "radial-gradient(circle, rgba(74,222,128,0.18) 0%, rgba(74,222,128,0.04) 70%)",
                border: "1.5px solid rgba(74,222,128,0.35)",
              }}
            >
              <Check className="h-7 w-7 text-[#4ADE80]" strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <p className="text-white font-semibold text-xl leading-snug">
                Deposit successful!
              </p>
              <p className="text-white/45 text-base leading-relaxed">
                You just deposited into{" "}
                <span className="text-white/70 font-medium">{vaultName}</span>.
                Your assets are now earning yield.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/6" />

            {/* Banner preview */}
            <div className="w-full overflow-hidden rounded-xl border border-white/8">
              <Image
                src={BANNER_PATH}
                alt="Share banner"
                width={400}
                height={200}
                unoptimized
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Share on X */}
            <div className="w-full flex flex-col gap-2">
              <ShareOnXButton
                amount={amount}
                vaultName={vaultName}
                apy={apy}
                shareId={shareId}
              />

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
