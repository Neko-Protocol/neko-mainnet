import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/share";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
      {children}
    </div>
  );
}
