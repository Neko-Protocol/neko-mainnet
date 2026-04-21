import { ReactNode } from "react";
import { WalletAutoConnect } from "@/components/WalletAutoConnect";
import { ConditionalLayout } from "./ConditionalLayout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <WalletAutoConnect />
      <ConditionalLayout>{children}</ConditionalLayout>
    </div>
  );
}
