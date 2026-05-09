import type { Metadata } from "next";
import { VaultDetailPage } from "@/features/shared/vault/components/pages/VaultDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Vault Details | Neko Protocol",
    description: `Deposit and withdraw from vault ${id} on Stellar.`,
  };
}

export default async function VaultDetailRoute({ params }: Props) {
  const { id } = await params;
  return <VaultDetailPage vaultId={decodeURIComponent(id)} />;
}
