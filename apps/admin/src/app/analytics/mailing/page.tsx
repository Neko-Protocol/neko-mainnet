import { BannerPage } from "@/components/ui/BannerPage";
import { MailingConsole } from "@/features/mailing/components/MailingConsole";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Mailing"
        subtitle="Send mass emails, manage templates, and configure triggered automations"
        badge="Notifications"
        imageSrc="/banners/mailing.png"
        imageAlt="Mailing illustration"
      />
      <MailingConsole />
    </div>
  );
}
