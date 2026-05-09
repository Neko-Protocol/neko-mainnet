"use client";

import { useEffect, useRef } from "react";
import { usersService } from "@/lib/services/users.service";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

// Registers the connected wallet with our Supabase users table on every
// connection event. Idempotent on the server: first connect inserts, repeat
// connects only refresh `updated_at`. Fire-and-forget; failures never surface
// to the user.
export function useUserSync() {
  const address = useStellarWalletStore((s) => s.address);
  const walletName = useStellarWalletStore((s) => s.walletName);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!address) return;
    if (lastSynced.current === address) return;
    lastSynced.current = address;
    void usersService.register({
      wallet_address: address,
      wallet_provider: walletName ?? null,
    });
  }, [address, walletName]);
}
