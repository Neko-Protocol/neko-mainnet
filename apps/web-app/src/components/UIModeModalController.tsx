"use client";

import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { useUIModeStore } from "@/stores/ui-mode.store";
import { UIModeModal } from "@/components/ui/UIModeModal";

/**
 * Renders the UI-mode selection modal exactly once — after the user connects
 * their wallet for the first time and before they have picked a mode.
 *
 * This is the single source of truth for the "should the modal appear?" decision.
 * It reads purely from Zustand stores; no localStorage is touched here.
 */
export function UIModeModalController() {
  const isConnected = useStellarWalletStore((s) => Boolean(s.address));
  const hasSelectedMode = useUIModeStore((s) => s.hasSelectedMode);
  const setMode = useUIModeStore((s) => s.setMode);

  if (!isConnected || hasSelectedMode) return null;

  return <UIModeModal onSelect={setMode} />;
}
