import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UIMode = "basic" | "expert";

interface UIModeState {
  mode: UIMode | null;
  hasSelectedMode: boolean;
  setMode: (mode: UIMode) => void;
}

export const useUIModeStore = create<UIModeState>()(
  persist(
    (set) => ({
      mode: null,
      hasSelectedMode: false,
      setMode: (mode) => set({ mode, hasSelectedMode: true }),
    }),
    { name: "ui_mode" }
  )
);
