import type { Metadata } from "next";
import RecommendedStrategiesPage from "@/features/simulator/pages/RecommendedStrategiesPage";

export const metadata: Metadata = {
  title: "Recommended Strategies | Neko Protocol",
  description:
    "Curated yield strategies picked by the Neko team. Use or save them to your library.",
};

export default function Page() {
  return <RecommendedStrategiesPage />;
}
