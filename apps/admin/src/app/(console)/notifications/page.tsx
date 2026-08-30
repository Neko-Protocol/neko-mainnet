import { BannerPage } from "@/components/ui/BannerPage";
import { NotificationsConsole } from "@/features/notifications/components/NotificationsConsole";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Notifications"
        subtitle="Configure what fires when something happens, in the app and by email"
        badge="Triggers"
        imageSrc="/banners/mailing.png"
        imageAlt="Notifications illustration"
      />
      <NotificationsConsole />
    </div>
  );
}
