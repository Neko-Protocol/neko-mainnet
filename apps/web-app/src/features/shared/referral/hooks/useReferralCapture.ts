"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useReferralStore } from "../stores/referral.store";
import { referralsService } from "../services/referrals.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useToast } from "@/hooks/useToast";

/**
 * Reads ?ref=<code> and decides what happens to it, one of three outcomes:
 *  - no code in the URL: nothing to do
 *  - not connected yet: saved, useAutoApplyReferral claims it the moment
 *    they connect
 *  - connected but already has a referrer: this one can never apply (a
 *    wallet is referred by exactly one entity, ever)
 *  - connected, unreferred (or the status check itself failed): saved, and
 *    useAutoApplyReferral claims it right away since a wallet is already
 *    on hand, no manual trip to Settings > Referrals needed
 */
export function useReferralCapture() {
  const searchParams = useSearchParams();
  const setRefCode = useReferralStore((s) => s.setRefCode);
  const address = useStellarWalletStore((s) => s.address);
  const { addNotification } = useToast();
  const t = useTranslations("sharedReferral.capture");

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (!ref) return;

    if (!address) {
      setRefCode(ref);
      addNotification(t("toast"), "info");
      return;
    }

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
  }, [searchParams, setRefCode, address, addNotification, t]);
}
