"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useReferralStore } from "../stores/referral.store";
import { useClaimReferral } from "./useClaimReferral";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useToast } from "@/hooks/useToast";
import { useApiErrorMessage } from "@/lib/helpers/useApiErrorMessage";
import { BackendError } from "@/lib/services/backend-client";

/**
 * Applies a captured referral code (from useReferralCapture, persisted in
 * useReferralStore) the moment a wallet is connected — no manual trip to
 * Settings > Referrals needed. Runs once per captured code: a code that
 * fails to apply (already referred, invalid, …) is dropped rather than
 * retried on every render.
 */
export function useAutoApplyReferral() {
  const address = useStellarWalletStore((s) => s.address);
  const refCode = useReferralStore((s) => s.refCode);
  const clearRefCode = useReferralStore((s) => s.clear);
  const claim = useClaimReferral();
  const { addNotification } = useToast();
  const errorMessage = useApiErrorMessage();
  const t = useTranslations("sharedReferral.settings");
  const attemptedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!address || !refCode || attemptedCode.current === refCode) return;
    attemptedCode.current = refCode;

    claim.mutate(refCode, {
      onSuccess: () => {
        addNotification(t("appliedToast"), "success");
        clearRefCode();
      },
      onError: (err) => {
        addNotification(
          errorMessage(err instanceof BackendError ? err.code : undefined),
          "error"
        );
        clearRefCode();
      },
    });
    // claim is a fresh useMutation result each render; only re-run this
    // effect when the wallet or the captured code actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refCode, addNotification, errorMessage, t, clearRefCode]);
}
