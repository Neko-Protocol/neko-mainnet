import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReferralState {
  /** Referral code this visitor arrived with (?ref=...). Last touch wins. */
  refCode: string | null;
  capturedAt: string | null;
  setRefCode: (code: string) => void;
  clear: () => void;
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      refCode: null,
      capturedAt: null,
      setRefCode: (code) =>
        set({
          refCode: code.trim().toUpperCase(),
          capturedAt: new Date().toISOString(),
        }),
      clear: () => set({ refCode: null, capturedAt: null }),
    }),
    { name: "neko_referral" }
  )
);
