import { BannerPage } from "@/components/ui/BannerPage";
import { AdminsSection } from "@/features/admins/components/AdminsSection";

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Admins"
        subtitle="Authorize who can sign in to the admin app"
        badge="Access"
        imageSrc="/banners/settings.svg"
        imageAlt="Admins illustration"
      />
      <AdminsSection />
    </div>
  );
}
