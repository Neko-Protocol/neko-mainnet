import type { Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getLocale, getTranslations } from "next-intl/server";
import { ModeSwitch } from "@/components/routing/ModeSwitch";
import { BasicDashboard } from "@/features/basic/dashboard";
import { Dashboard } from "@/features/expert/dashboard";
import { defindexVaultsKey } from "@/features/shared/vault/queryKeys";
import { getDefindexVaults } from "@/features/shared/vault/server/vaults";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Dashboard | Neko Protocol",
  description: "Overview of your portfolio, pools, and protocol activity.",
};

/**
 * The vault catalogue is fetched here and shipped inside the HTML.
 *
 * It is the one dataset on this page that does not depend on a connected
 * wallet, and several panels wait on it — including the APY card, which reads
 * each vault's APY straight off this response. Fetching it during the render
 * takes it off the client's critical path, where it could not start until the
 * bundle had downloaded and hydrated.
 *
 * Safe alongside the app's PersistQueryClientProvider: hydration merges by
 * timestamp, so this fresher server copy wins over anything restored from a
 * previous session's localStorage, and a restore cannot clobber it.
 */
export default async function DashboardPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("sharedVault.mapper");
  const queryClient = new QueryClient();

  const vaults = await getDefindexVaults(locale, t);
  if (vaults) {
    queryClient.setQueryData(defindexVaultsKey(locale), vaults);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ModeSwitch basic={<BasicDashboard />} expert={<Dashboard />} />
    </HydrationBoundary>
  );
}
