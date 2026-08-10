import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "@stellar/design-system/build/styles.min.css";
import "./globals.css";
import { Providers } from "./providers";
import { ReferralCapture } from "@/features/shared/referral/components/ReferralCapture";
import { DAPP_PUBLIC_ORIGIN, DAPP_SOCIAL_CARD_IMAGE } from "@/lib/share";
import type { Locale } from "@/i18n/config";

const ROOT_TITLE = "Neko Protocol";

// OG locale tags per BCP 47 region conventions; es maps to es_MX pending
// confirmation of the primary Spanish-speaking target market.
const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  en: "en_US",
  es: "es_MX",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common.meta");
  const description = t("description");
  const socialCardAlt = t("socialCardAlt");

  return {
    metadataBase: new URL(DAPP_PUBLIC_ORIGIN),
    title: ROOT_TITLE,
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: ROOT_TITLE,
      description,
      url: "/",
      siteName: ROOT_TITLE,
      locale: OPEN_GRAPH_LOCALE[locale] ?? OPEN_GRAPH_LOCALE.en,
      type: "website",
      images: [
        {
          url: DAPP_SOCIAL_CARD_IMAGE,
          width: 1200,
          height: 630,
          alt: socialCardAlt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ROOT_TITLE,
      description,
      site: "@NekoProto",
      creator: "@NekoProto",
      images: [
        {
          url: DAPP_SOCIAL_CARD_IMAGE,
          width: 1200,
          height: 630,
          alt: socialCardAlt,
          type: "image/png",
        },
      ],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ReferralCapture />
            {children}
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
