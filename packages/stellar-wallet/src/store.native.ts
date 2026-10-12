import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StellarWalletState } from "./types";

export type { StellarWalletState };

/**
 * Same store as `store.ts`. React Native has no `localStorage`, which is
 * what `persist` uses by default, so the address is kept in AsyncStorage.
 */
export const useStellarWalletStore = create<StellarWalletState>()(
  persist(
    (set) => ({
      address: null,
      walletName: null,
      setWallet: ({ address, walletName }) => set({ address, walletName }),
      clearWallet: () => set({ address: null, walletName: null }),
    }),
    {
      name: "stellar-wallet",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
