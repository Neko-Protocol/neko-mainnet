"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, X } from "lucide-react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usersService } from "@/lib/services/users.service";

const DISMISS_KEY = "neko:email-nudge-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

export function EmailNudgeBanner() {
  const { address, isConnected } = useStellarWallet();
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  useEffect(() => {
    if (!isConnected || !address || dismissed) return;
    let cancelled = false;
    void usersService.get(address).then((u) => {
      if (cancelled) return;
      setHasEmail(Boolean(u?.email));
    });
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, dismissed]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  const show =
    isConnected && Boolean(address) && !dismissed && hasEmail === false;
  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Mail className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90">
            Add an email (optional)
          </p>
          <p className="truncate text-xs text-white/50">
            Stay in the loop on your activity. We&apos;ll only use it to reach
            you.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/settings#email"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          Add email
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
