import type { Metadata } from "next";
import DiscoverPage from "@/features/discover/components/pages/DiscoverPage";

export const metadata: Metadata = {
  title: "Discover Assets | Neko Protocol",
  description:
    "Explore supported real-world assets and market data on Neko Protocol.",
};

export default function DiscoverRoute() {
  return <DiscoverPage />;
}
