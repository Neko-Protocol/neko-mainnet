"use server";

import type { VaultDepositorsGroup } from "@neko/api-contracts";
import { fetchFromBackend } from "@/lib/services/backend-client";

export async function fetchVaultDepositors(): Promise<VaultDepositorsGroup[]> {
  const { groups } = await fetchFromBackend<{
    groups: VaultDepositorsGroup[];
  }>("admin-analytics/vault-depositors");
  return groups;
}
