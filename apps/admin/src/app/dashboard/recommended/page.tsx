import { listRecommendedStrategies } from "@/lib/recommended-strategies";
import RecommendedClient from "./recommended-client";

export default async function RecommendedPage() {
  const recommendations = await listRecommendedStrategies();

  return <RecommendedClient recommendations={recommendations} />;
}
