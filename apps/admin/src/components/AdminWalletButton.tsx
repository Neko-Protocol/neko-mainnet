"use client";

import { Wallet, X } from "lucide-react";

interface AdminWalletButtonProps {
  address: string | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function AdminWalletButton({
  address,
  connecting,
  onConnect,
  onDisconnect,
}: AdminWalletButtonProps) {
  if (address) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-neko-blue/30 bg-neko-blue/10 py-1.5 pl-4 pr-2 text-sm text-neko-blue">
        <Wallet className="size-4" aria-hidden />
        <span className="font-mono text-xs">{truncate(address)}</span>
        <button
          type="button"
          onClick={onDisconnect}
          className="rounded-full p-1 text-neko-blue/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Disconnect wallet"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={connecting}
      className="inline-flex items-center gap-2 rounded-lg bg-neko-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-60"
    >
      <Wallet className="size-4" aria-hidden />
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
