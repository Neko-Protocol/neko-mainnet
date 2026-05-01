"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function DashboardTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const poolDetail = pathname ? /^\/pools\/[^/]+/.test(pathname) : false;
  const discoverDetail = pathname ? /^\/discover\/[^/]+/.test(pathname) : false;

  return (
    <div
      className={
        poolDetail
          ? "flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden pt-6 sm:pt-8 pb-2"
          : discoverDetail
            ? "w-full min-w-0 max-w-full flex flex-col items-stretch py-6 sm:py-8"
            : "w-full min-w-0 max-w-full flex flex-col items-center overflow-x-hidden px-4 sm:px-6 py-6 sm:py-8"
      }
    >
      {children}
    </div>
  );
}
