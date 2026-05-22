import { listStrategies, getStrategyStats } from "@/lib/strategies";
import StrategiesClient from "./strategies-client";

export default async function StrategiesPage() {
  const [strategies, stratStats] = await Promise.all([
    listStrategies(),
    getStrategyStats(),
  ]);

  let totalInvited = 0;
  let totalAccepted = 0;
  for (const s of strategies) {
    totalInvited += s.total_invitations;
    totalAccepted += s.accepted;
  }
  const avgAcceptance =
    totalInvited > 0
      ? Math.round((totalAccepted / totalInvited) * 1000) / 10
      : 0;

  return (
    <StrategiesClient
      strategies={strategies}
      stratStats={stratStats}
      aggregates={{ totalInvited, avgAcceptance }}
    />
  );
}
