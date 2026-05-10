import type { Metadata } from "next";
import VaultDetail from "@/features/shared/vault/components/pages/VaultDetail";

export const metadata: Metadata = {
  title: "Vault Details | Neko Protocol",
  description: "Deposit and withdraw from Neko vaults on Stellar.",
};

export default function VaultDetailPage({
  params,
}: {
  params: Promise<{ vaultid: string }>;
}) {
  return <VaultDetail params={params} />;
}
