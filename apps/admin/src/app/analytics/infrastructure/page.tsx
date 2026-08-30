import { BannerPage } from "@/components/ui/BannerPage";
import { InfrastructureSection } from "@/features/infrastructure/components/InfrastructureSection";

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Infrastructure"
        subtitle="RPC endpoint pool, cache and failover — the counters behind the Grafana dashboard"
        badge="Live"
        imageSrc="/banners/oracle.svg"
        imageAlt="Infrastructure illustration"
      />
      <InfrastructureSection />
    </div>
  );
}
