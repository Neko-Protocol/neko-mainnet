import { ReactNode } from "react";
import { WalletAutoConnect } from "@/components/WalletAutoConnect";
import { CurrencyRateSync } from "@/components/CurrencyRateSync";
import { ConditionalLayout } from "./ConditionalLayout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <WalletAutoConnect />
      <CurrencyRateSync />
      <ConditionalLayout>{children}</ConditionalLayout>
    </div>
  );
}
