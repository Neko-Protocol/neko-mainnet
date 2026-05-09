"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useUIMode } from "@/hooks/useUIMode";

export default function ExpertModeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { isBasic, mode } = useUIMode();

  useEffect(() => {
    if (mode !== null && isBasic) {
      router.replace("/dashboard");
    }
  }, [isBasic, mode, router]);

  if (mode !== null && isBasic) return null;

  return <>{children}</>;
}
