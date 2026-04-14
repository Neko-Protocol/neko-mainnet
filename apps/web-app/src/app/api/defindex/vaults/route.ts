import { NextResponse } from "next/server";
import { createDefindexServerSdk } from "@/lib/defindex/createServerSdk";
import { defindexInfoToVaultView } from "@/lib/defindex/mapToVaultView";
import { defindexNetworkFromEnv } from "@/lib/defindex/network";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";
import { parseDefindexVaultIds } from "@/lib/defindex/vaultIds";
import type { VaultView } from "@/features/vault/types/vault";

export const dynamic = "force-dynamic";

function formatVaultFetchError(reason: unknown): string {
  if (reason && typeof reason === "object") {
    const o = reason as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
    try {
      return JSON.stringify(o);
    } catch {
      return "Unknown error";
    }
  }
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

export async function GET() {
  const network = defindexNetworkFromEnv();
  if (!network) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "unsupported_network",
    });
  }

  const ids = parseDefindexVaultIds();
  if (ids.length === 0) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "no_vault_ids",
      hint: "Set DEFINDEX_VAULT_IDS or NEXT_PUBLIC_DEFINDEX_VAULT_IDS with vault contract addresses.",
    });
  }

  const hasApiKey = Boolean(getDefindexApiKeyFromEnv());
  if (!hasApiKey) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "missing_defindex_api_key",
      hint: "Set DEFINDEX_API_KEY in apps/web-app/.env.local (server-only). The DeFindex HTTP API returns 403 without it.",
    });
  }

  const sdk = createDefindexServerSdk();

  const settled = await Promise.allSettled(
    ids.map(async (contractId) => {
      const info = await sdk.getVaultInfo(contractId, network);
      return defindexInfoToVaultView(contractId, info);
    })
  );

  const vaults: VaultView[] = [];
  const fetchErrors: { contractId: string; message: string }[] = [];
  settled.forEach((r, i) => {
    const contractId = ids[i] ?? "";
    if (r.status === "fulfilled") {
      vaults.push(r.value);
    } else {
      fetchErrors.push({
        contractId,
        message: formatVaultFetchError(r.reason),
      });
    }
  });

  return NextResponse.json({
    vaults,
    ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
  });
}
