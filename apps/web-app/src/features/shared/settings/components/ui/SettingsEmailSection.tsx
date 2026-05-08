"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useToast } from "@/hooks/useToast";
import { usersService } from "@/lib/services/users.service";
import type { UserPublic } from "@/lib/types/user.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SettingsEmailSection() {
  const { address, isConnected } = useStellarWallet();
  const { addNotification } = useToast();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!address) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void usersService.get(address).then((u) => {
      if (cancelled) return;
      setUser(u);
      setDraft(u?.email ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("email");
    if (status === "verified") {
      addNotification("Email verified", "success");
    } else if (status === "error") {
      addNotification(
        "Could not verify that link. Try sending a new one.",
        "error"
      );
    }
    if (status) {
      params.delete("email");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
      );
    }
  }, [addNotification]);

  const verified = Boolean(user?.email_verified_at);
  const hasEmail = Boolean(user?.email);

  const handleSend = async () => {
    if (!address) return;
    const email = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      addNotification("Enter a valid email address", "error");
      return;
    }
    setSending(true);
    try {
      const res = await usersService.startEmailVerification(address, email);
      if (res.ok) {
        addNotification("Verification link sent. Check your inbox.", "success");
        setUser((prev) =>
          prev
            ? { ...prev, email, email_verified_at: null }
            : {
                wallet_address: address,
                wallet_provider: null,
                email,
                email_verified_at: null,
                created_at: new Date().toISOString(),
                preferences: {},
              }
        );
      } else {
        addNotification(
          res.error ? `Could not send: ${res.error}` : "Could not send link",
          "error"
        );
      }
    } finally {
      setSending(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <SectionCard title="Email (optional)">
        <div className="rounded-xl bg-[#2A2A2A] px-4 py-5 text-center">
          <p className="text-sm text-white/40">
            Connect a wallet to add an email.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div id="email" className="scroll-mt-24">
      <SectionCard title="Email (optional)">
        <p className="text-xs leading-relaxed text-white/50">
          Optional. We&apos;ll only use it to reach you about your activity.
          You&apos;ll get a magic link to verify ownership.
        </p>

        {hasEmail && (
          <div className="flex items-center justify-between rounded-xl bg-[#2A2A2A] px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-white/40">Current</span>
              <span className="truncate text-sm font-medium text-white/80">
                {user?.email}
              </span>
            </div>
            {verified ? (
              <span className="ml-3 flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : (
              <span className="ml-3 shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                Pending
              </span>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/40">
            {hasEmail ? "Change email" : "Add email"}
          </span>
          <div className="flex items-center gap-2 rounded-xl bg-[#2A2A2A] px-3 py-2">
            <Mail className="h-4 w-4 text-white/30" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading || sending}
              className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/25 focus:outline-none disabled:opacity-50"
            />
          </div>
        </label>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={
            sending ||
            loading ||
            !draft.trim() ||
            (hasEmail && draft.trim().toLowerCase() === user?.email && verified)
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors duration-150 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send verification link"}
        </button>
      </SectionCard>
    </div>
  );
}
