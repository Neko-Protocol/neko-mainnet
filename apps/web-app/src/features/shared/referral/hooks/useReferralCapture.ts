"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useReferralStore } from "../stores/referral.store";
import { referralsService } from "../services/referrals.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useToast } from "@/hooks/useToast";

/**
 * Reads ?ref=<code> and decides what happens to it, one of four outcomes:
 *  - no code in the URL: nothing to do
 *  - not connected yet: saved, applies once they connect
 *  - connected but already has a referrer: this one can never apply (a
 *    wallet is referred by exactly one entity, ever)
 *  - connected, unreferred: saved, needs Settings > Referrals to apply
 * A failed status check (network blip) can't tell which of the last two
 * applies, so it saves the code without claiming either — claim() itself
 * is the real, live source of truth once they try to apply it.
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
          addNotification(t("alreadyReferredToast"), "info");
          return;
        }
        setRefCode(ref);
        addNotification(t("readyToApplyToast"), "info");
      })
      .catch(() => {
        setRefCode(ref);
        addNotification(t("savedToast"), "info");
      });
  }, [searchParams, setRefCode, address, addNotification, t]);
}
