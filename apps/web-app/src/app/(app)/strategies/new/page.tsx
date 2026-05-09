import type { Metadata } from "next";
import SimulatorPage from "@/features/simulator/pages/SimulatorPage";

export const metadata: Metadata = {
  title: "Strategy Builder | Neko Protocol",
  description:
    "Pick a token and destination, project your returns, then save the strategy for later.",
};

export default function Page() {
  return <SimulatorPage />;
}
