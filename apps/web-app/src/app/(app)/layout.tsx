import { ReactNode } from "react";
import { WalletAutoConnect } from "@/features/shared/wallet/components/WalletAutoConnect";
import { PendingMultisigTxsWatcher } from "@/features/shared/wallet/components/PendingMultisigTxsWatcher";
import { CurrencyRateSync } from "@/features/shared/currency/components/CurrencyRateSync";
import { UIModeModalController } from "@/features/shared/ui-mode/components/UIModeModalController";
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
