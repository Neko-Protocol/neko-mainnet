import type { Metadata } from "next";
import StrategiesLibraryPage from "@/features/simulator/pages/StrategiesLibraryPage";

export const metadata: Metadata = {
  title: "Strategies | Neko Protocol",
  description: "Plan your DeFi positions and execute when ready.",
};

export default function Page() {
  return <StrategiesLibraryPage />;
}
