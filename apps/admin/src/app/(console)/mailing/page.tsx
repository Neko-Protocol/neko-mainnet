import { BannerPage } from "@/components/ui/BannerPage";
import { MailingConsole } from "@/features/mailing/components/MailingConsole";

export default function MailingPage() {
  return (
    <div className="space-y-6">
      <BannerPage
        title="Mailing"
        subtitle="Send mass emails and manage the templates they draw on"
        badge="Email"
        imageSrc="/banners/mailing.png"
        imageAlt="Mailing illustration"
      />
      <MailingConsole />
    </div>
  );
}
