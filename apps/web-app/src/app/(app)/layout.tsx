import { ReactNode } from "react";
import { WalletAutoConnect } from "@/components/WalletAutoConnect";
import { PendingMultisigTxsWatcher } from "@/components/PendingMultisigTxsWatcher";
import { CurrencyRateSync } from "@/components/CurrencyRateSync";
import { UIModeModalController } from "@/components/UIModeModalController";
import { ConditionalLayout } from "./ConditionalLayout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <WalletAutoConnect />
      <PendingMultisigTxsWatcher />
      <CurrencyRateSync />
      <UIModeModalController />
      <ConditionalLayout>{children}</ConditionalLayout>
    </div>
  );
}
