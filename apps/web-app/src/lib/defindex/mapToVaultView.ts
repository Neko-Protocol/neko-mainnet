import type { VaultInfoResponse } from "@defindex/sdk";
import type {
  VaultAsset,
  VaultConfig,
  VaultView,
  VaultStrategyAllocation,
} from "@/features/shared/vault/types/vault";
import {
  vaultArtForSymbol,
  vaultDedicatedArtKey,
} from "@/features/shared/vault/utils/vaultAssetArt";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { getTokenIcon } from "@/lib/helpers/tokenUtils";

// Per-vault static overrides: contractId → fields that differ from the defaults.
// Merge order: defaults → STATIC_OVERRIDES[contractId] → derived fields.
const STATIC_OVERRIDES: Record<string, Partial<VaultConfig>> = {
  // CETES vault - Neko-managed, keep DeFindex as platform
  CCFWKCD52JNSQLN5OS4F7EG6BPDT4IRJV6KODIEIZLWPM35IKHOKT6S2: {
    createdBy: "DeFindex",
    creatorIconSrc: "/defindex-logo.svg",
  },
  // USDC Beans
  CBNKCU3HGFKHFOF7JTGXQCNKE3G3DXS5RDBQUKQMIIECYKXPIOUGB2S3: {
    createdBy: "Beans",
    creatorIconSrc: "/assets/vault-creators/beans.jpeg",
    issuerIconSrc: "/assets/vault-assets/beans.svg",
  },
  // CETES Soroswap Earn
  CC24OISYJHWXZIFZBRJHFLVO5CNN3PQSKZE5BBBZLSSI5Z23TKC6GQY2: {
    createdBy: "Soroswap",
    creatorIconSrc: "/assets/vault-creators/soroswap.jpg",
    issuerIconSrc: "/assets/vault-assets/soroswap.svg",
  },
  // USTRY Soroswap Earn
  CDI7QVDTNDFEHB25VFQGMNFALGCXXKAWUSHOTQR2D4O44CATQJ5ZQMN6: {
    createdBy: "Soroswap",
    creatorIconSrc: "/assets/vault-creators/soroswap.jpg",
    issuerIconSrc: "/assets/vault-assets/soroswap.svg",
  },
  // USDC Soroswap Earn
  CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK: {
    createdBy: "Soroswap",
    creatorIconSrc: "/assets/vault-creators/soroswap.jpg",
    issuerIconSrc: "/assets/vault-assets/soroswap.svg",
  },
  // EURC Soroswap Earn
  CCKTLDG6I2MMJCKFWXXBXMA42LJ3XN2IOW6M7TK6EWNPJTS736ETFF2N: {
    createdBy: "Soroswap",
    creatorIconSrc: "/assets/vault-creators/soroswap.jpg",
    issuerIconSrc: "/assets/vault-assets/soroswap.svg",
  },
  // EURC Beans
  CAIZ3NMNPEN5SQISJV7PD2YY6NI6DIPFA4PCRUBOGDE4I7A3DXDLK5OI: {
    createdBy: "Beans",
    creatorIconSrc: "/assets/vault-creators/beans.jpeg",
    issuerIconSrc: "/assets/vault-assets/beans.svg",
  },
  // USDC HANA
  CBUJZL5QAD5TOPD7JMCBQ3RHR6RZWY34A4QF7UHILTDH2JF2Z3VJGY2Y: {
    createdBy: "HANA",
    creatorIconSrc: "/assets/vault-creators/hana.png",
    issuerIconSrc: "/assets/vault-assets/hanah.svg",
  },
  // USDC Rozo
  CCDRFMZ7CH364ATQ5YSVTEJ3G3KPNFVM6TTC6N4T5REHWJS6LGVFP7MY: {
    createdBy: "Rozo",
    creatorIconSrc: "/assets/vault-creators/rozo.jpeg",
    issuerIconSrc: "/assets/vault-assets/rozo.svg",
  },
  // USDC Meru
  CCA2ZJP5BVRXYTQH4FAGHCAUMRYCXVC4CRYC2NXHWMR7TIVX36U7F5HR: {
    createdBy: "Meru",
    creatorIconSrc: "/assets/vault-creators/meru.jpg",
    issuerIconSrc: "/assets/vault-assets/meru.svg",
  },
  // EURC Neko
  CB3FUMFGCF6DHSFK6N2TOKHRMYXS34HFKQR45UKVORCRUM35AF3ES7WQ: {
    createdBy: "Neko",
    creatorIconSrc: "/neko-logo.png",
    issuerIconSrc: "/assets/vault-assets/neko.svg",
  },
  // USDC Neko (Fixed-only)
  CCUZC3HC5TH2VCYZFUG57E6IGKPL45YUN2SI3UEYQUBA7RCYHUIZBSFV: {
    createdBy: "Neko",
    creatorIconSrc: "/neko-logo.png",
    issuerIconSrc: "/assets/vault-assets/neko.svg",
  },
  // CETES Neko
  CANBU7T77SCJOOAU6VQAOGR7DN36JBQFUN56XS2WA2VPJYUSRUBIPYDS: {
    createdBy: "Neko",
    creatorIconSrc: "/neko-logo.png",
    issuerIconSrc: "/assets/vault-assets/neko.svg",
  },
  // USTRY Neko
  CCIRVAW3IZVAYLHR7YYMZFOQVYEW67OKFFXR3J6ZR2T6YJC5V7GTSNQ5: {
    createdBy: "Neko",
    creatorIconSrc: "/neko-logo.png",
    issuerIconSrc: "/assets/vault-assets/neko.svg",
  },
  // TESOURO Neko
  CBMERS7MJHO6TGKUVWWU34ZSKWCFOWPG2ZCIRIT75IC3YDWBIPBMV5LB: {
    createdBy: "Neko",
    creatorIconSrc: "/neko-logo.png",
    issuerIconSrc: "/assets/vault-assets/neko.svg",
  },
};

function toVaultAsset(
  symbol: string,
  name: string,
  contractAddress = ""
): VaultAsset {
  const art = vaultArtForSymbol(symbol);
  const poolIcon = contractAddress.trim()
    ? getTokenIcon(contractAddress)
    : null;
  const dedicated = vaultDedicatedArtKey(symbol);
  const iconSrc = poolIcon ?? art.iconSrc;
  const iconWhiteSrc =
    poolIcon && dedicated
      ? art.iconWhiteSrc
      : poolIcon
        ? poolIcon
        : art.iconWhiteSrc;
  return {
    symbol,
    name,
    iconSrc,
    iconWhiteSrc,
    logoSrc: iconSrc,
    network: "Stellar",
    contractAddress,
  };
}

function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatManagedAmount(amountStr: string): string {
  const n = Number(amountStr) / 1e7;
  if (Number.isNaN(n)) return "-";
  if (n <= 0) return formatAmount(0);
  if (n >= 1_000_000) return `${formatAmount(n / 1_000_000)}M`;
  if (n >= 1_000) return `${formatAmount(n / 1_000)}k`;
  if (n !== 0 && Math.abs(n) < 0.0001) return n.toExponential(4);
  return formatAmount(n);
}

function buildStrategyAllocations(
  info: VaultInfoResponse
): VaultStrategyAllocation[] | undefined {
  const funds = info.totalManagedFunds;
  if (!funds?.length) return undefined;

  const assets = info.assets ?? [];
  const assetByAddr = new Map(assets.map((a) => [a.address, a]));
  const strategyNameByAddr = new Map<string, string>();
  for (const a of assets) {
    for (const s of a.strategies ?? []) {
      strategyNameByAddr.set(s.address, s.name);
    }
  }

  const rows: VaultStrategyAllocation[] = [];
  for (const mf of funds) {
    const asset = assetByAddr.get(mf.asset);
    const symbol = asset?.symbol ?? shortAddr(mf.asset);
    for (const alloc of mf.strategy_allocations ?? []) {
      rows.push({
        assetSymbol: symbol,
        strategyName:
          strategyNameByAddr.get(alloc.strategy_address) ?? "Strategy",
        strategyAddress: alloc.strategy_address,
        amountLabel: formatManagedAmount(alloc.amount),
        paused: alloc.paused,
      });
    }
  }
  return rows.length ? rows : undefined;
}

function formatTvl(
  info: VaultInfoResponse,
  priceUsdByAsset: Record<string, number> = {}
): string {
  const funds = info.totalManagedFunds ?? [];
  if (funds.length === 0) return "-";
  let sum = 0;
  for (const a of funds) {
    const tokens = Number(a.total_amount ?? 0) / 1e7;
    if (Number.isNaN(tokens)) continue;
    const price = priceUsdByAsset[a.asset] ?? 1;
    sum += tokens * price;
  }
  if (sum <= 0) return "-";
  if (sum >= 1_000_000) return `$${formatAmount(sum / 1_000_000)}M`;
  if (sum >= 1_000)
    return `$${sum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${formatAmount(sum)}`;
}

/**
 * Maps DeFindex `getVaultInfo` payload into the app `VaultView` used by cards and modals.
 */
export function defindexInfoToVaultView(
  contractId: string,
  info: VaultInfoResponse,
  priceUsdByAsset: Record<string, number> = {}
): VaultView {
  const assets = info.assets ?? [];
  const primary = assets[0];
  const supplyAsset = primary
    ? toVaultAsset(primary.symbol, primary.name, primary.address ?? "")
    : toVaultAsset(info.symbol, info.name);

  const collateralAssets =
    assets.length > 0
      ? assets.map((a) => toVaultAsset(a.symbol, a.name, a.address ?? ""))
      : [supplyAsset];

  const strategiesFlat = assets.flatMap((a) =>
    (a.strategies ?? []).map((s) => ({
      protocol: s.name,
      description: s.address,
    }))
  );

  const strategyRecord: Record<string, string> = {};
  const strategyNameCount = new Map<string, number>();
  for (const a of assets) {
    for (const s of a.strategies ?? []) {
      const n = (strategyNameCount.get(s.name) ?? 0) + 1;
      strategyNameCount.set(s.name, n);
      const label = n === 1 ? s.name : `${s.name} (${s.address.slice(0, 5)}…)`;
      strategyRecord[label] = s.address;
    }
  }

  const strategyAllocations = buildStrategyAllocations(info);

  const apyNum = info.apy != null ? Number(info.apy) : null;
  const apyStr =
    apyNum != null && !Number.isNaN(apyNum) && apyNum > 0
      ? `${apyNum.toFixed(2)}%`
      : "-";

  const overrides = STATIC_OVERRIDES[contractId] ?? {};

  const config: VaultConfig = {
    id: contractId,
    name: info.name,
    description: `${info.symbol} vault via DeFindex on Stellar.`,
    category: "lending",
    status: "active",
    supplyAsset,
    collateralAssets,
    createdBy: "DeFindex",
    creatorIconSrc: "/defindex-logo.svg",
    variant: "light",
    featured: true,
    ...overrides,
    detail: {
      description: `Vault with ${assets.length} underlying asset(s).`,
      strategies: strategiesFlat,
      contracts: {
        vault: contractId,
        pools: {},
        strategies: strategyRecord,
      },
      strategyAllocations,
      liquidity:
        "Liquidity depends on underlying strategies and DeFindex vault rules.",
    },
  };

  return {
    ...config,
    tvl: formatTvl(info, priceUsdByAsset),
    apy7d: apyStr,
    utilization: "-",
    totalSupply: "-",
  };
}
