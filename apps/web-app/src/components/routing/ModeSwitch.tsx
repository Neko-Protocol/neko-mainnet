"use client";

import { type ReactNode } from "react";
import { useUIMode } from "@/hooks/useUIMode";

interface ModeSwitchProps {
  basic: ReactNode;
  expert: ReactNode;
}


export function ModeSwitch({ basic, expert }: ModeSwitchProps) {
  const { isBasic } = useUIMode();
  return isBasic ? <>{basic}</> : <>{expert}</>;
}
