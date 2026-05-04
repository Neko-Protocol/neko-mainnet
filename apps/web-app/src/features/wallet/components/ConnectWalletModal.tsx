"use client";

import { X } from "lucide-react";
import { useStellarWallet } from "@/hooks/useStellarWallet";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
}: ConnectWalletModalProps) {
  const { connect, connectWithPrivy } = useStellarWallet();

  if (!isOpen) return null;

  const handlePrivyConnect = async () => {
    await connectWithPrivy();
    onClose();
  };

  const handleStellarConnect = async () => {
    await connect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => void handlePrivyConnect()}
            className="w-full flex items-center gap-4 rounded-2xl bg-[#229EDF] hover:bg-[#1a8bc7] border border-white/10 p-4 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                Continue with Email or Google
              </p>
              <p className="text-white/70 text-xs">
                Creates a Stellar embedded wallet
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/30 text-xs uppercase tracking-[0.2em]">
              or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={() => void handleStellarConnect()}
            className="w-full flex items-center gap-4 rounded-2xl bg-[#2A2A2A] hover:bg-[#333] border border-white/5 p-4 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-full bg-[#1a2a4a] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Stellar Wallet</p>
              <p className="text-white/40 text-xs">
                Freighter, Lobstr, xBull, Ledger, WalletConnect
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
