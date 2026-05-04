import type { Metadata } from "next";
import SimulatorPage from "@/features/simulator/pages/SimulatorPage";

export const metadata: Metadata = {
  title: "Simulator | Neko Protocol",
  description:
    "See what you could earn — pick a token, pick a place to put it, and project your returns.",
};

export default function Page() {
  return <SimulatorPage />;
}
