"use server";

import type { WalletVaultPosition } from "@neko-protocol/api-contracts";
import { fetchFromBackend } from "@/lib/services/backend-client";

export async function fetchWalletPositions(
  wallet: string
): Promise<WalletVaultPosition[]> {
  if (!wallet.trim()) return [];
  const { positions } = await fetchFromBackend<{
    positions: WalletVaultPosition[];
  }>("admin-analytics/wallet-positions", { wallet: wallet.trim() });
  return positions;
}
