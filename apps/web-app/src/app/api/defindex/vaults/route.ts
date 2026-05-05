import { NextResponse } from "next/server";
import type DefindexSDK from "@defindex/sdk";
import type { SupportedNetworks } from "@defindex/sdk";
import { createDefindexServerSdk } from "@/lib/defindex/createServerSdk";
import { defindexInfoToVaultView } from "@/lib/defindex/mapToVaultView";
import { defindexNetworkFromEnv } from "@/lib/defindex/network";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";
import { parseDefindexVaultIds } from "@/lib/defindex/vaultIds";
import type { VaultView } from "@/features/shared/vault/types/vault";

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

function isRateLimitError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : String(err ?? "").toLowerCase();
  return (
    msg.toLowerCase().includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("too many")
  );
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetches a single vault with up to `maxRetries` retries on rate-limit errors.
async function fetchVaultWithRetry(
  sdk: InstanceType<typeof DefindexSDK>,
  contractId: string,
  network: SupportedNetworks,
  maxRetries = 3
): Promise<VaultView> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const info = await sdk.getVaultInfo(contractId, network);
      return defindexInfoToVaultView(contractId, info);
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        await delay(600 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
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
  const vaults: VaultView[] = [];
  const fetchErrors: { contractId: string; message: string }[] = [];

  // Fetch sequentially with a small gap to avoid rate limiting.
  for (let i = 0; i < ids.length; i++) {
    const contractId = ids[i]!;
    try {
      const view = await fetchVaultWithRetry(sdk, contractId, network);
      vaults.push(view);
    } catch (err) {
      fetchErrors.push({
        contractId,
        message: formatVaultFetchError(err),
      });
    }
    // 150 ms gap between requests keeps us well under typical API rate limits.
    if (i < ids.length - 1) await delay(150);
  }

  return NextResponse.json({
    vaults,
    ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
  });
}
