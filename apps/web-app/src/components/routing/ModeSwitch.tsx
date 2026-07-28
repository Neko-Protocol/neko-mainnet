"use client";

import { type ReactNode } from "react";
import { useUIMode } from "@/features/shared/ui-mode/hooks/useUIMode";

interface ModeSwitchProps {
  basic: ReactNode;
  expert: ReactNode;
}

/**
 * Renders the `basic` subtree when the user is in basic mode,
 * or `expert` otherwise. Single source of truth for mode-based
 * rendering decisions at the page level.
 */
export function ModeSwitch({ basic, expert }: ModeSwitchProps) {
  const { isBasic } = useUIMode();
  return isBasic ? <>{basic}</> : <>{expert}</>;
}
