import { Suspense } from "react";
import type { Metadata } from "next";
import { Swap } from "@/features/expert/swap";

export const metadata: Metadata = {
  title: "Swap | Neko Protocol",
  description: "Swap tokens seamlessly using Neko Protocol.",
};

export default function SwapPage() {
  return (
    <Suspense>
      <Swap />
    </Suspense>
  );
}
