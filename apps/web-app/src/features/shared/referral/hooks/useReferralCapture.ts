"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useReferralStore } from "../stores/referral.store";
import { referralsService } from "../services/referrals.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useToast } from "@/hooks/useToast";

// A wallet that was connected in a previous session takes a moment to
// reconnect on load; without this grace period, a visitor who's actually
// already connected would briefly see the "connect your wallet" toast.
const WALLET_RECONNECT_GRACE_MS = 2750;

/**
 * Reads ?ref=<code> and decides what happens to it, one of three outcomes:
 *  - no code in the URL: nothing to do
 *  - not connected yet: saved immediately (not delayed by the grace period
 *    below), so a brand-new wallet's registration (useUserSync, which reads
 *    this store on the very next render once address appears) can attribute
 *    the referral atomically instead of racing a later claim() call. The
 *    grace period only delays the "connect your wallet" toast itself, since
 *    a *reconnecting* wallet may show up within it and take the branch
 *    below on the next render instead.
 *  - connected but already has a referrer: this one can never apply (a
 *    wallet is referred by exactly one entity, ever) — never saved, so a
 *    stray claim() attempt can't even try
 *  - connected, unreferred (or the status check itself failed): saved, and
 *    useAutoApplyReferral claims it right away since a wallet is already
 *    on hand, no manual trip to Settings > Referrals needed
 *
 * Guarded by a ref so the toast/getMe check only runs once per distinct
 * code: addNotification is a new function identity every render (useToast()
 * isn't memoized), which would otherwise re-run this effect on unrelated
 * re-renders, e.g. the one caused by useAutoApplyReferral's own successful
 * claim, re-checking getMe() and wrongly firing "already referred" for a
 * referral this same link just created.
 */
export function useReferralCapture() {
  const searchParams = useSearchParams();
  const setRefCode = useReferralStore((s) => s.setRefCode);
  const address = useStellarWalletStore((s) => s.address);
  const { addNotification } = useToast();
  const t = useTranslations("sharedReferral.capture");
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (!ref || processedRef.current === ref) return;

    if (address) {
      processedRef.current = ref;
      referralsService
        .getMe(address)
        .then((me) => {
          if (me.referred_by) {
            addNotification(t("alreadyReferredToast"), "warning");
            return;
          }
          setRefCode(ref);
        })
        .catch(() => setRefCode(ref));
      return;
    }

    setRefCode(ref);
    const timer = setTimeout(() => {
      processedRef.current = ref;
      addNotification(t("toast"), "info");
    }, WALLET_RECONNECT_GRACE_MS);

    return () => clearTimeout(timer);
  }, [searchParams, setRefCode, address, addNotification, t]);
}
