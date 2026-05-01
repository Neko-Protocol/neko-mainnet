"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { MobileHeader } from "@/components/navigation/MobileHeader";

export function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPoolDetail = /^\/pools\/[^/]+/.test(pathname);
  const isDiscoverAssetDetail = /^\/discover\/[^/]+/.test(pathname);

  if (isPoolDetail) {
    return (
      <main
        className="flex max-h-dvh min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden text-white"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    );
  }

  if (isDiscoverAssetDetail) {
    return (
      <main
        className="flex min-h-screen min-w-0 flex-1 flex-col items-center text-white w-full"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <MobileHeader />
      <main
        className="pt-16 lg:pt-0 lg:ml-[270px] flex min-h-screen min-w-0 flex-1 flex-col items-center overflow-x-hidden text-white w-full"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </>
  );
}
