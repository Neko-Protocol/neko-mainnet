"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PendingMultisigAction = "deposit" | "withdraw";

export interface PendingMultisigTx {
  hash: string;
  walletAddress: string;
  vaultContractId: string;
  vaultLabel: string; // human label like "DeFindex USDC"
  amount: string; // human amount string, e.g. "1000"
  assetSymbol: string; // e.g. "USDC"
  action: PendingMultisigAction;
  submittedAt: number; // ms epoch
}

interface PendingMultisigTxsState {
  txs: PendingMultisigTx[];
  add: (tx: PendingMultisigTx) => void;
  remove: (hash: string) => void;
  forWallet: (walletAddress: string) => PendingMultisigTx[];
  clear: () => void;
}

export const usePendingMultisigTxsStore = create<PendingMultisigTxsState>()(
  persist(
    (set, get) => ({
      txs: [],
      add: (tx) =>
        set((st) => {
          // Avoid duplicates by hash
          if (st.txs.some((t) => t.hash === tx.hash)) return st;
          return { txs: [tx, ...st.txs] };
        }),
      remove: (hash) =>
        set((st) => ({ txs: st.txs.filter((t) => t.hash !== hash) })),
      forWallet: (walletAddress) =>
        get().txs.filter((t) => t.walletAddress === walletAddress),
      clear: () => set({ txs: [] }),
    }),
    {
      name: "neko.pendingMultisigTxs.v1",
      partialize: (st) => ({ txs: st.txs }),
    }
  )
);
