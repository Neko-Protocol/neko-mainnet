import type { Metadata } from "next";
import { ModeSwitch } from "@/components/routing/ModeSwitch";
import { BasicDiscoverPage } from "@/features/basic/discover";
import { ExpertDiscoverPage } from "@/features/expert/discover";

export const metadata: Metadata = {
  title: "Discover Assets | Neko Protocol",
  description:
    "Explore supported real-world assets and market data on Neko Protocol.",
};

export default function DiscoverRoute() {
  return (
    <ModeSwitch basic={<BasicDiscoverPage />} expert={<ExpertDiscoverPage />} />
  );
}
