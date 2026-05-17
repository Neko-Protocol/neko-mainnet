import type { Metadata } from "next";
import Vault from "@/features/shared/vault/components/pages/Vault";
import { DAPP_VAULTS_PUBLIC_URL } from "@/lib/share";

const DAPP_ORIGIN = new URL(DAPP_VAULTS_PUBLIC_URL).origin;

const VAULTS_TITLE = "Vaults | Neko Protocol";
const VAULTS_DESCRIPTION =
  "Discover and deposit into Neko vaults. Real-time RWA yield on Stellar.";

const VAULTS_CARD_IMAGE =
  "https://dapp.nekoprotocol.xyz/x/X-Banner.jpg?v=20260517-3";

export const metadata: Metadata = {
  metadataBase: new URL(DAPP_ORIGIN),
  title: VAULTS_TITLE,
  description: VAULTS_DESCRIPTION,
  alternates: { canonical: "/vaults" },

  openGraph: {
    title: VAULTS_TITLE,
    description: VAULTS_DESCRIPTION,
    url: DAPP_VAULTS_PUBLIC_URL,
    siteName: "Neko Protocol",
    images: [
      {
        url: VAULTS_CARD_IMAGE,
        width: 1200,
        height: 630,
        alt: "Neko Protocol - Real yield from RWAs on Stellar",
        type: "image/jpeg",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: VAULTS_TITLE,
    description: VAULTS_DESCRIPTION,
    site: "@NekoProto",
    creator: "@NekoProto",
    images: [
      {
        url: VAULTS_CARD_IMAGE,
        width: 1200,
        height: 630,
        alt: "Neko Protocol - Real yield from RWAs on Stellar",
        type: "image/jpeg",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default function VaultPage() {
  return <Vault />;
}
