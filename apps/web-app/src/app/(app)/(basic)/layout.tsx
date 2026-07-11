"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useUIMode } from "@/features/shared/ui-mode/hooks/useUIMode";

export default function BasicModeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isExpert, mode } = useUIMode();

  useEffect(() => {
    if (mode !== null && isExpert) {
      router.replace("/dashboard");
    }
  }, [isExpert, mode, router]);

  if (mode !== null && isExpert) return null;

  return <>{children}</>;
}
