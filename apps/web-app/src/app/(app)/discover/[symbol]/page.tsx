import type { Metadata } from "next";
import { ModeSwitch } from "@/components/routing/ModeSwitch";
import { BasicAssetDetail } from "@/features/basic/discover";
import { ExpertAssetDetail } from "@/features/expert/discover";

export const metadata: Metadata = {
  title: "Asset Detail | Neko Protocol",
  description:
    "Live price, chart, and details for this asset on Neko Protocol.",
};

export default function AssetDetailRoute() {
  return (
    <ModeSwitch basic={<BasicAssetDetail />} expert={<ExpertAssetDetail />} />
  );
}
