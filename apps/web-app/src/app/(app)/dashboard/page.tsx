import type { Metadata } from "next";
import { ModeSwitch } from "@/components/routing/ModeSwitch";
import { BasicDashboard } from "@/features/basic/dashboard";
import { Dashboard } from "@/features/expert/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Neko Protocol",
  description: "Overview of your portfolio, pools, and protocol activity.",
};

export default function DashboardPage() {
  return <ModeSwitch basic={<BasicDashboard />} expert={<Dashboard />} />;
}
