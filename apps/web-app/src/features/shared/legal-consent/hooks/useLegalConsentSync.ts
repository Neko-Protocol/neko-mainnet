"use client";

import { useEffect } from "react";
import { usersService } from "@/lib/services/users.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/constants/legal";
import { useLegalConsentStore } from "../stores/legal-consent.store";

// Pulls legal-acceptance status from Supabase on every wallet connection.
// Server is the source of truth (no local persistence) so acceptance is
// re-checked per session/device rather than cached.
export function useLegalConsentSync() {
  const address = useStellarWalletStore((s) => s.address);
  const setStatus = useLegalConsentStore((s) => s.setStatus);
  const reset = useLegalConsentStore((s) => s.reset);

  useEffect(() => {
    if (!address) {
      reset();
      return;
    }

    setStatus("loading");
    void usersService.get(address).then((user) => {
      const accepted =
        !!user?.terms_accepted_at &&
        user.terms_version === CURRENT_TERMS_VERSION &&
        !!user?.privacy_accepted_at &&
        user.privacy_version === CURRENT_PRIVACY_VERSION;
      setStatus(accepted ? "accepted" : "needs-consent");
    });
  }, [address, setStatus, reset]);
}
