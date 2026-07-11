"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SimulatorToken,
  SimulatorDestination,
} from "@/features/simulator/strategies/types/simulator.types";

export interface SavedStrategy {
  id: string;
  walletAddress: string;
  name: string;
  createdAt: string;
  token: SimulatorToken;
  destination: SimulatorDestination;
  stackVenue: SimulatorDestination | null;
  amount: string;
  snapshotApy: number | null;
  sourceRecommendationId?: string;
}

export type PendingRecommendedPayload = {
  token: SimulatorToken;
  destination: SimulatorDestination;
  stackVenue: SimulatorDestination | null;
  amount: string;
};

interface StrategiesState {
  strategies: SavedStrategy[];
  pendingExecuteId: string | null;
  pendingRecommended: PendingRecommendedPayload | null;
  save: (s: Omit<SavedStrategy, "id" | "createdAt">) => string;
  remove: (id: string, walletAddress: string) => void;
  rename: (id: string, walletAddress: string, name: string) => void;
  setPendingExecuteId: (id: string | null) => void;
  setPendingRecommended: (payload: PendingRecommendedPayload | null) => void;
}

function stripRaw(d: SimulatorDestination): SimulatorDestination {
  return { ...d, raw: null };
}

export const useStrategiesStore = create<StrategiesState>()(
  persist(
    (set) => ({
      strategies: [],
      pendingExecuteId: null,
      pendingRecommended: null,
      save: (s) => {
        const id = crypto.randomUUID();
        const entry: SavedStrategy = {
          ...s,
          destination: stripRaw(s.destination),
          stackVenue: s.stackVenue ? stripRaw(s.stackVenue) : null,
          id,
          createdAt: new Date().toISOString(),
        };
        set((st) => ({ strategies: [entry, ...st.strategies] }));
        return id;
      },
      remove: (id, walletAddress) =>
        set((st) => ({
          strategies: st.strategies.filter(
            (x) => !(x.id === id && x.walletAddress === walletAddress)
          ),
        })),
      rename: (id, walletAddress, name) =>
        set((st) => ({
          strategies: st.strategies.map((x) =>
            x.id === id && x.walletAddress === walletAddress
              ? { ...x, name }
              : x
          ),
        })),
      setPendingExecuteId: (id) => set({ pendingExecuteId: id }),
      setPendingRecommended: (payload) => set({ pendingRecommended: payload }),
    }),
    {
      name: "neko_strategies",
      partialize: (s) => ({
        strategies: s.strategies,
      }),
    }
  )
);
