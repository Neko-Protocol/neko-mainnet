"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Check, X, Copy, CheckCheck } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

const TWEET_TEXT = encodeURIComponent(
  "Just made my first deposit into a @NekoProto vault! Real yield on RWAs. \n\nOn @BuildOnStellar \n\nare yours working yet? nekoprotocol.xyz"
);
const SHARE_URL = `https://x.com/intent/tweet?text=${TWEET_TEXT}`;
const BANNER_PATH = "/X-Banner.png";

const XLogo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface VaultDepositSuccessModalProps {
  vaultName: string;
  onClose: () => void;
}

export function VaultDepositSuccessModal({
  vaultName,
  onClose,
}: VaultDepositSuccessModalProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(BANNER_PATH);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API not supported
    }
  };

  const handleShare = () => {
    window.open(SHARE_URL, "_blank", "noopener,noreferrer");
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
          <button
            aria-label="Close"
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center px-10 pt-7 pb-6 gap-4">
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

            <div className="w-full h-px bg-white/6" />

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

            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyImage}
                className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border"
                style={{
                  background: copied
                    ? "rgba(74,222,128,0.08)"
                    : "rgba(255,255,255,0.05)",
                  borderColor: copied
                    ? "rgba(74,222,128,0.3)"
                    : "rgba(255,255,255,0.1)",
                  color: copied ? "#4ADE80" : "rgba(255,255,255,0.6)",
                }}
              >
                {copied ? (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    Image copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy image to paste in tweet
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex w-full items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150"
                style={{
                  background: "#000",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1a1a1a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#000")
                }
              >
                <XLogo />
                Share on X
              </button>

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
