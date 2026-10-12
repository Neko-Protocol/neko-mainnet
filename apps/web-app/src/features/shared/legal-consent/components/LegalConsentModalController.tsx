"use client";

import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useLegalConsentStore } from "../stores/legal-consent.store";
import { LegalConsentModal } from "./LegalConsentModal";

export function LegalConsentModalController() {
  const isConnected = useStellarWalletStore((s) => Boolean(s.address));
  const status = useLegalConsentStore((s) => s.status);

  if (!isConnected || status !== "needs-consent") return null;

  return <LegalConsentModal />;
}
