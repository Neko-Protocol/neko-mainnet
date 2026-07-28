"use client";

import { useUIModeStore } from "../stores/ui-mode.store";

export function useUIMode() {
  const mode = useUIModeStore((s) => s.mode);
  return {
    mode,
    isBasic: mode === "basic",
    isExpert: mode === "expert",
  };
}
