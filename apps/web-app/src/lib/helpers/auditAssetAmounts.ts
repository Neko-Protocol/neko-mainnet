import {
  getAssetsConfig,
  getContractToCodeMap,
} from "@/lib/constants/assets.config";
import type { Token } from "@/lib/types/swapTypes";

export function normalizeAuditAssetKey(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;

  const assets = getAssetsConfig();

  if (s.startsWith("C") && s.length === 56) {
    const byContract = getContractToCodeMap()[s];
    return byContract ?? s;
  }

  if (assets[s]) {
    return assets[s].code;
  }

  const upper = s.toUpperCase();
  for (const info of Object.values(assets)) {
    if (info.code.toUpperCase() === upper) {
      return info.code;
    }
  }

  return s;
}

/** Resolve decimals for an audit `asset_*` key (token code or Soroban contract `C…`). */
export function resolveDecimalsForAuditAssetKey(
  codeOrContract: string
): number | undefined {
  const s = codeOrContract.trim();
  const assets = getAssetsConfig();
  if (s.startsWith("C") && s.length === 56) {
    for (const info of Object.values(assets)) {
      if (info.contract === s) return info.decimals;
    }
    return undefined;
  }
  return assets[s]?.decimals;
}

export function resolveDecimalsForSwapToken(
  token: Token | string
): number | undefined {
  const assets = getAssetsConfig();
  if (typeof token === "string") {
    return resolveDecimalsForAuditAssetKey(token);
  }
  if (token.type === "native") {
    return assets.XLM?.decimals ?? 7;
  }
  if (token.contract) {
    for (const info of Object.values(assets)) {
      if (info.contract === token.contract) return info.decimals;
    }
  }
  if (token.code && assets[token.code]) {
    return assets[token.code]?.decimals;
  }
  return undefined;
}

/** Convert a non-negative integer string in smallest units to a human float. */
export function smallestUnitsStringToHuman(
  amountSmallest: string,
  decimals: number
): number | undefined {
  try {
    const raw = BigInt(amountSmallest);
    const scale = 10n ** BigInt(decimals);
    return Number(raw) / Number(scale);
  } catch {
    return undefined;
  }
}
