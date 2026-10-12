import { create } from "zustand";

export type LegalConsentStatus = "loading" | "needs-consent" | "accepted";

interface LegalConsentState {
  status: LegalConsentStatus;
  setStatus: (status: LegalConsentStatus) => void;
  reset: () => void;
}

export const useLegalConsentStore = create<LegalConsentState>()((set) => ({
  status: "loading",
  setStatus: (status) => set({ status }),
  reset: () => set({ status: "loading" }),
}));
