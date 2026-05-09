import type { PoolInfo, PoolType } from "@/lib/orchestrator/types/pool.types";
import type {
  VaultView,
  VaultCategory,
} from "@/features/shared/vault/types/vault";
import type { VaultApyStrategy } from "@/features/shared/vault/hooks/useVaultApy";

const POOL_PROTOCOL_LABEL: Record<PoolType, string> = {
  blend: "Blend",
  neko: "Neko",
  soroswap: "Soroswap",
  aqua: "Aqua",
  custom: "Pool",
};

const POOL_STRATEGY_LABEL: Record<PoolType, string> = {
  blend: "Lend your tokens and earn interest",
  soroswap: "Provide liquidity and earn trading fees",
  aqua: "Provide liquidity and earn trading fees",
  neko: "Earn yield from this pool",
  custom: "Earn yield from this pool",
};

const VAULT_CATEGORY_LABEL: Record<VaultCategory, string> = {
  lending: "Lending",
  amm: "AMM",
  staking: "Staking",
  rwa: "Real-world assets",
};

const VAULT_CATEGORY_STRATEGY: Record<VaultCategory, string> = {
  lending: "Earn lending interest",
  amm: "Earn trading fees",
  staking: "Earn staking rewards",
  rwa: "Earn yield from real-world assets",
};

const STRATEGY_NAME_LABEL: Record<string, string> = {
  neko: "Lend on Neko pool",
  aquarius: "Provide liquidity on Aquarius",
  soroswap: "Provide liquidity on Soroswap",
  blend: "Lend on Blend",
  defindex: "Earn yield with DeFindex",
};

function plainLabelForStrategyName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (STRATEGY_NAME_LABEL[normalized]) {
    return STRATEGY_NAME_LABEL[normalized];
  }
  return `Earn yield via ${name}`;
}

export function getPoolProtocolLabel(pool: PoolInfo): string {
  return POOL_PROTOCOL_LABEL[pool.type] ?? "Pool";
}

export function getVaultProtocolLabel(vault: VaultView): string {
  return VAULT_CATEGORY_LABEL[vault.category] ?? "Vault";
}

export function getPoolStrategyLabels(pool: PoolInfo): string[] {
  return [POOL_STRATEGY_LABEL[pool.type] ?? "Earn yield from this pool"];
}

const YIELD_TOKEN_STRATEGY_LABELS: Record<string, string> = {
  CETES:
    "Yield-bearing Mexican Treasury exposure - accrues in MXN while you hold",
  USTRY: "Yield-bearing US Treasury exposure - accrues in USD while you hold",
  TESOURO:
    "Yield-bearing Brazilian sovereign exposure - accrues in BRL while you hold",
  KTB: "Yield-bearing Korean Treasury exposure - accrues in KRW while you hold",
};

export function getYieldTokenStrategyLabel(symbol: string): string {
  const upper = symbol.toUpperCase();
  return (
    YIELD_TOKEN_STRATEGY_LABELS[upper] ??
    "Yield-bearing bond token - accrues while you hold it"
  );
}

export function getYieldTokenHoldExplanation(symbol: string): string {
  return `No pool or vault needed: ${symbol} already yields while held-the token reflects accrual on the underlying sovereign bond.`;
}

export function getVaultStrategyLabels(
  vault: VaultView,
  apyStrategies?: VaultApyStrategy[]
): string[] {
  const labels: string[] = [];

  if (apyStrategies && apyStrategies.length > 0) {
    for (const strategy of apyStrategies) {
      if (strategy.weight === 0) continue;
      labels.push(plainLabelForStrategyName(strategy.name));
    }
  }

  if (labels.length === 0 && vault.detail?.strategies?.length) {
    for (const strategy of vault.detail.strategies) {
      if (strategy.protocol) {
        labels.push(plainLabelForStrategyName(strategy.protocol));
      }
    }
  }

  if (labels.length === 0) {
    labels.push(
      VAULT_CATEGORY_STRATEGY[vault.category] ?? "Earn yield with this vault"
    );
  }

  return Array.from(new Set(labels));
}
