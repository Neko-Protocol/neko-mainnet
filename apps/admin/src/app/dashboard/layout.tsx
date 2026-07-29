import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-neko-accent px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main
        id="admin-main"
        className="min-w-0 flex-1 bg-admin-canvas lg:overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
