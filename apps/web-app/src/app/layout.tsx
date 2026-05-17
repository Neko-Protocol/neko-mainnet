import type { Metadata, Viewport } from "next";
import "@stellar/design-system/build/styles.min.css";
import "./globals.css";
import { Providers } from "./providers";
import { DAPP_PUBLIC_ORIGIN, DAPP_SOCIAL_CARD_IMAGE } from "@/lib/share";

const ROOT_TITLE = "Neko Protocol";
const ROOT_DESCRIPTION =
  "All-in-one platform for RWAs on Stellar — vaults, liquidity, and real yield.";

const SOCIAL_CARD_ALT = "Neko Protocol - Real yield from RWAs on Stellar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(DAPP_PUBLIC_ORIGIN),
  title: ROOT_TITLE,
  description: ROOT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    url: "/",
    siteName: ROOT_TITLE,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: DAPP_SOCIAL_CARD_IMAGE,
        width: 1200,
        height: 630,
        alt: SOCIAL_CARD_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    site: "@NekoProto",
    creator: "@NekoProto",
    images: [
      {
        url: DAPP_SOCIAL_CARD_IMAGE,
        width: 1200,
        height: 630,
        alt: SOCIAL_CARD_ALT,
        type: "image/png",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
