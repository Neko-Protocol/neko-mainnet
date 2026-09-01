import { BannerPage } from "@/components/ui/BannerPage";
import { OverviewSection } from "@/features/analytics/components/OverviewSection";
import { UsersSection } from "@/features/analytics/components/UsersSection";
import { VaultsSection } from "@/features/analytics/components/VaultsSection";
import { WalletPositions } from "@/features/analytics/components/WalletPositions";
import { TransactionsTable } from "@/features/analytics/components/TransactionsTable";

const DEFAULT_WALLET =
  "GAPNNM2YZ5KP7FCX7ENELRUEU7JZRS5ZRWWXXYYA3S6GQXXUML7HZ63M";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Analytics"
        subtitle="Overview of TVL, users, vaults, and protocol activity"
        badge="Welcome back"
        imageSrc="/banners/oracle.svg"
        imageAlt="Analytics illustration"
      />
      <OverviewSection />
      <UsersSection />
      <VaultsSection />
      <WalletPositions wallet={DEFAULT_WALLET} />
      <TransactionsTable />
    </div>
  );
}
