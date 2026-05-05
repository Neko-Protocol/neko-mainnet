import type { VaultAsset, VaultView } from "../types/vault";

const DEFAULT_ICON = "/assets/vault-assets/usdc.svg";

const VAULT_ASSET_ART: Record<
  string,
  { iconSrc: string; iconWhiteSrc: string }
> = {
  USDC: {
    iconSrc: "/assets/vault-assets/usdc.svg",
    iconWhiteSrc: "/assets/vault-assets/usdc-white.svg",
  },
  CETES: {
    iconSrc: "/assets/vault-assets/cetes.svg",
    iconWhiteSrc: "/assets/vault-assets/cetes-white.svg",
  },
  EURC: {
    iconSrc: "/assets/vault-assets/eurc.svg",
    iconWhiteSrc: "/assets/vault-assets/eurc-white.svg",
  },
  USTRY: {
    iconSrc: "/assets/vault-assets/ustry.svg",
    iconWhiteSrc: "/assets/vault-assets/ustry-white.svg",
  },
};

/** Stellar / Soroban symbols are often padded with NUL bytes — strip for lookups. */
export function normalizeVaultSymbol(raw: string): string {
  return raw.replace(/\0/g, "").trim().toUpperCase();
}

/**
 * Non-null when `vaultArtForSymbol` uses a dedicated vault SVG pair (incl. white variant).
 */
export function vaultDedicatedArtKey(
  symbol: string
): keyof typeof VAULT_ASSET_ART | null {
  return resolveVaultArtKey(normalizeVaultSymbol(symbol));
}

function resolveVaultArtKey(
  normalized: string
): keyof typeof VAULT_ASSET_ART | null {
  if (normalized in VAULT_ASSET_ART)
    return normalized as keyof typeof VAULT_ASSET_ART;
  if (normalized.includes("CETES")) return "CETES";
  if (normalized.includes("USDC")) return "USDC";
  if (normalized.includes("EURC")) return "EURC";
  if (normalized.includes("USTRY")) return "USTRY";
  return null;
}

export function vaultArtForSymbol(symbol: string): {
  iconSrc: string;
  iconWhiteSrc: string;
} {
  const key = resolveVaultArtKey(normalizeVaultSymbol(symbol));
  return key
    ? VAULT_ASSET_ART[key]
    : { iconSrc: DEFAULT_ICON, iconWhiteSrc: DEFAULT_ICON };
}

export function toVaultAssetFromSymbol(
  symbol: string,
  name: string,
  contractAddress = ""
): VaultAsset {
  const art = vaultArtForSymbol(symbol);
  return {
    symbol,
    name,
    iconSrc: art.iconSrc,
    iconWhiteSrc: art.iconWhiteSrc,
    logoSrc: art.iconSrc,
    network: "Stellar",
    contractAddress,
  };
}

/**
 * Assets shown in the vault card header (tilted squares). DeFindex often
 * returns a single share/leg while the product is USDC + CETES — always show
 * both when we can infer USDC or CETES from the collateral or supply symbol.
 */
export function vaultHeaderIllustrationAssets(vault: VaultView): VaultAsset[] {
  const list = vault.collateralAssets;
  if (list.length >= 2) return list;
  if (list.length !== 1) return list;

  const only = list[0];
  if (!only) return list;

  const fromCollateral = resolveVaultArtKey(normalizeVaultSymbol(only.symbol));
  const fromSupply = vault.supplyAsset
    ? resolveVaultArtKey(normalizeVaultSymbol(vault.supplyAsset.symbol))
    : null;

  const key = fromCollateral ?? fromSupply;
  // Pair CETES with USDC for the illustration; other single-asset vaults show alone.
  if (key === "CETES") {
    return [toVaultAssetFromSymbol("USDC", "USD Coin"), only];
  }
  return list;
}
