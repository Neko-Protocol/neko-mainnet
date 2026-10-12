"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StellarWalletState } from "./types";

export type { StellarWalletState };

export const useStellarWalletStore = create<StellarWalletState>()(
  persist(
    (set) => ({
      address: null,
      walletName: null,
      setWallet: ({ address, walletName }) => set({ address, walletName }),
      clearWallet: () => set({ address: null, walletName: null }),
    }),
    { name: "stellar-wallet" }
  )
);
