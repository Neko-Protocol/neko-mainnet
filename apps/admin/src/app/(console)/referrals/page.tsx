import { BannerPage } from "@/components/ui/BannerPage";
import { ReferralPartnersSection } from "@/features/referral-partners/components/ReferralPartnersSection";
import { ReferralLeaderboardsSection } from "@/features/referrals/components/ReferralLeaderboardsSection";

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Referrals"
        subtitle="Create and manage referral codes for contracted companies and influencers"
        badge="Growth"
        imageSrc="/banners/settings.svg"
        imageAlt="Referrals illustration"
      />
      <ReferralPartnersSection />
      <ReferralLeaderboardsSection />
    </div>
  );
}
