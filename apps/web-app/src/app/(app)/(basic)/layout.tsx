"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useUIMode } from "@/hooks/useUIMode";

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
