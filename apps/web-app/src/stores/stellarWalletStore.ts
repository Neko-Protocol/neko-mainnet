import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StellarWalletSource = "kit" | "privy";

export interface StellarWalletState {
  address: string | null;
  walletName: string | null;
  source: StellarWalletSource | null;
  setWallet: (payload: {
    address: string;
    walletName: string;
    source: StellarWalletSource;
  }) => void;
  clearWallet: () => void;
}

export const useStellarWalletStore = create<StellarWalletState>()(
  persist(
    (set) => ({
      address: null,
      walletName: null,
      source: null,
      setWallet: ({ address, walletName, source }) =>
        set({ address, walletName, source }),
      clearWallet: () => set({ address: null, walletName: null, source: null }),
    }),
    {
      name: "stellar-wallet",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<StellarWalletState> | undefined;

        if (!state?.address || state.source) {
          return state;
        }

        return {
          ...state,
          source: "kit" as const,
        };
      },
    }
  )
);
