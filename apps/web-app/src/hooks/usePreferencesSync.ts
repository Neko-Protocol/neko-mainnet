"use client";

import { useEffect, useRef } from "react";
import { usersService } from "@/lib/services/users.service";
import { useCurrencyStore } from "@/stores/currency.store";
import { useUIModeStore } from "@/stores/ui-mode.store";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

// Syncs currency and UI-mode preferences between Supabase and local Zustand stores.
// Pull: on wallet connect, Supabase wins and overwrites local defaults.
// Push: on any preference change after initialization, updates Supabase fire-and-forget.
export function usePreferencesSync() {
  const address = useStellarWalletStore((s) => s.address);
  const setSelectedCurrency = useCurrencyStore((s) => s.setSelectedCurrency);
  const setMode = useUIModeStore((s) => s.setMode);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const uiMode = useUIModeStore((s) => s.mode);

  // Guards against echoing the pull back to Supabase as a push.
  const initialized = useRef(false);

  // Effect 1: pull from Supabase on connect.
  useEffect(() => {
    if (!address) {
      initialized.current = false;
      return;
    }
    initialized.current = false;

    void usersService.get(address).then((user) => {
      const prefs = user?.preferences ?? {};
      if (prefs.currency) setSelectedCurrency(prefs.currency);
      if (prefs.ui_mode) setMode(prefs.ui_mode);
      // Set AFTER the state updates so React batches the re-render before
      // initialized becomes true, keeping Effect 2 from firing on pull.
      initialized.current = true;
    });
  }, [address, setSelectedCurrency, setMode]);

  // Effect 2: push to Supabase when preferences change after initialization.
  useEffect(() => {
    if (!address || !initialized.current) return;
    void usersService.updatePreferences(address, {
      currency: selectedCurrency,
      ui_mode: uiMode,
    });
  }, [selectedCurrency, uiMode, address]);
}
