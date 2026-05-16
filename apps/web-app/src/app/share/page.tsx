import type { Metadata } from "next";
import { redirect } from "next/navigation";

const BASE_URL = "https://nekoprotocol.xyz";

export const metadata: Metadata = {
  title: "Neko Protocol — Real yield on RWAs on Stellar",
  description:
    "Deposit into vaults and earn real yield on Real-World Assets, built on Stellar.",
  openGraph: {
    title: "Neko Protocol — Real yield on RWAs on Stellar",
    description:
      "Deposit into vaults and earn real yield on Real-World Assets, built on Stellar.",
    url: `${BASE_URL}/share`,
    siteName: "Neko Protocol",
    images: [
      {
        url: `${BASE_URL}/X-Banner.png`,
        width: 1200,
        height: 630,
        alt: "Neko Protocol",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neko Protocol — Real yield on RWAs on Stellar",
    description:
      "Deposit into vaults and earn real yield on Real-World Assets, built on Stellar.",
    images: [`${BASE_URL}/X-Banner.png`],
    site: "@NekoProto",
  },
};

export default function SharePage() {
  redirect("/dashboard");
}
