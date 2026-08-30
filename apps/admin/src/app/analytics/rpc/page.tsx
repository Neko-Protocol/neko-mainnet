import { BannerPage } from "@/components/ui/BannerPage";
import { RpcSection } from "@/features/rpc/components/RpcSection";

export default function RpcPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="RPC"
        subtitle="Endpoint pool, cache and failover — the counters behind the Grafana dashboard"
        badge="Live"
        imageSrc="/banners/oracle.svg"
        imageAlt="RPC illustration"
      />
      <RpcSection />
    </div>
  );
}
