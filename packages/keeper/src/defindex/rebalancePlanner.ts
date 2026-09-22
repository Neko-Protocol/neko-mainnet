import type { Instruction } from "@neko-protocol/defindex-vault";
import type { VaultRebalanceConfig } from "./rebalanceConfig.js";

export const REBALANCE_THRESHOLD_STROOPS = 10_000_000n;

const BPS_SCALE = 10_000n;
const DISPLAY_DECIMALS = 7;

export type RebalancePlanReason =
  | "ready"
  | "balanced"
  | "idle_below_threshold"
  | "no_total"
  | "unsupported_multi_asset";

export interface ManagedFundsStrategyAllocationLike {
  strategy_address: string;
  amount: { toString(): string };
}

export interface ManagedFundsEntryLike {
  idle_amount: { toString(): string };
  invested_amount?: { toString(): string };
  total_amount?: { toString(): string };
  strategy_allocations: ManagedFundsStrategyAllocationLike[];
}

export interface PlannedInstruction {
  type: "Invest" | "Unwind";
  strategy: string;
  strategyName: string;
  amount: string;
  amountHuman: number;
}

export interface TargetAllocation {
  strategy: string;
  strategyName: string;
  targetBps: number;
  currentAmount: string;
  targetAmount: string;
  deltaAmount: string;
  currentAmountHuman: number;
  targetAmountHuman: number;
  deltaAmountHuman: number;
}

export interface RebalanceInstructionPlan {
  reason: RebalancePlanReason;
  instructions: Instruction[];
  publicInstructions: PlannedInstruction[];
  targetAllocations: TargetAllocation[];
  warnings: string[];
  idleAmount: bigint;
  investedAmount: bigint;
  totalAmount: bigint;
  canRebalance: boolean;
}

interface StrategyDelta {
  address: string;
  name: string;
  current: bigint;
  target: bigint;
  delta: bigint;
}

function toBigIntAmount(value: { toString(): string } | undefined): bigint {
  if (!value) return 0n;
  return BigInt(value.toString());
}

function toHumanAmount(amount: bigint): number {
  return Number(amount) / 10 ** DISPLAY_DECIMALS;
}

function toPublicInstruction(
  type: "Invest" | "Unwind",
  strategy: { address: string; name: string },
  amount: bigint
): PlannedInstruction {
  return {
    type,
    strategy: strategy.address,
    strategyName: strategy.name,
    amount: amount.toString(),
    amountHuman: toHumanAmount(amount),
  };
}

function buildTargets(
  config: VaultRebalanceConfig,
  totalAmount: bigint,
  currentByStrategy: Map<string, bigint>
): StrategyDelta[] {
  let assigned = 0n;
  const deltas = config.strategies.map((strategy) => {
    const target = (totalAmount * BigInt(strategy.targetBps)) / BPS_SCALE;
    assigned += target;
    return {
      address: strategy.address,
      name: strategy.name,
      current: currentByStrategy.get(strategy.address) ?? 0n,
      target,
      delta: 0n,
    };
  });

  if (deltas.length > 0) {
    deltas[0].target += totalAmount - assigned;
  }

  return deltas.map((delta) => ({
    ...delta,
    delta: delta.target - delta.current,
  }));
}

function toTargetAllocations(
  config: VaultRebalanceConfig,
  deltas: StrategyDelta[]
): TargetAllocation[] {
  const targetBpsByStrategy = new Map(
    config.strategies.map((strategy) => [strategy.address, strategy.targetBps])
  );

  return deltas.map((delta) => ({
    strategy: delta.address,
    strategyName: delta.name,
    targetBps: targetBpsByStrategy.get(delta.address) ?? 0,
    currentAmount: delta.current.toString(),
    targetAmount: delta.target.toString(),
    deltaAmount: delta.delta.toString(),
    currentAmountHuman: toHumanAmount(delta.current),
    targetAmountHuman: toHumanAmount(delta.target),
    deltaAmountHuman: toHumanAmount(delta.delta),
  }));
}

function planSingleStrategy(
  config: VaultRebalanceConfig,
  idleAmount: bigint
): {
  instructions: Instruction[];
  publicInstructions: PlannedInstruction[];
  reason: RebalancePlanReason;
} {
  if (idleAmount < REBALANCE_THRESHOLD_STROOPS) {
    return {
      instructions: [],
      publicInstructions: [],
      reason: idleAmount > 0n ? "idle_below_threshold" : "balanced",
    };
  }

  const strategy = config.strategies[0];
  const instruction: Instruction = {
    tag: "Invest",
    values: [strategy.address, idleAmount],
  };

  return {
    instructions: [instruction],
    publicInstructions: [toPublicInstruction("Invest", strategy, idleAmount)],
    reason: "ready",
  };
}

function planMultipleStrategies(
  deltas: StrategyDelta[],
  idleAmount: bigint
): {
  instructions: Instruction[];
  publicInstructions: PlannedInstruction[];
  reason: RebalancePlanReason;
} {
  const deficits = deltas.filter(
    (delta) => delta.delta >= REBALANCE_THRESHOLD_STROOPS
  );
  const surpluses = deltas.filter(
    (delta) => -delta.delta >= REBALANCE_THRESHOLD_STROOPS
  );

  const totalSignificantDeficit = deficits.reduce(
    (sum, delta) => sum + delta.delta,
    0n
  );
  let remainingUnwindNeed =
    totalSignificantDeficit > idleAmount
      ? totalSignificantDeficit - idleAmount
      : 0n;

  const instructions: Instruction[] = [];
  const publicInstructions: PlannedInstruction[] = [];
  let availableToInvest = idleAmount;

  for (const surplus of surpluses) {
    if (remainingUnwindNeed < REBALANCE_THRESHOLD_STROOPS) break;
    const surplusAmount = -surplus.delta;
    const unwindAmount =
      surplusAmount < remainingUnwindNeed ? surplusAmount : remainingUnwindNeed;
    if (unwindAmount < REBALANCE_THRESHOLD_STROOPS) continue;

    instructions.push({
      tag: "Unwind",
      values: [surplus.address, unwindAmount],
    });
    publicInstructions.push(
      toPublicInstruction(
        "Unwind",
        { address: surplus.address, name: surplus.name },
        unwindAmount
      )
    );
    availableToInvest += unwindAmount;
    remainingUnwindNeed -= unwindAmount;
  }

  for (const deficit of deficits) {
    if (availableToInvest < REBALANCE_THRESHOLD_STROOPS) break;
    const investAmount =
      deficit.delta < availableToInvest ? deficit.delta : availableToInvest;
    if (investAmount < REBALANCE_THRESHOLD_STROOPS) continue;

    instructions.push({
      tag: "Invest",
      values: [deficit.address, investAmount],
    });
    publicInstructions.push(
      toPublicInstruction(
        "Invest",
        { address: deficit.address, name: deficit.name },
        investAmount
      )
    );
    availableToInvest -= investAmount;
  }

  return {
    instructions,
    publicInstructions,
    reason: instructions.length > 0 ? "ready" : "balanced",
  };
}

export function planVaultRebalance(
  config: VaultRebalanceConfig,
  funds: ManagedFundsEntryLike[]
): RebalanceInstructionPlan {
  const warnings: string[] = [];

  if (funds.length !== 1) {
    return {
      reason: "unsupported_multi_asset",
      instructions: [],
      publicInstructions: [],
      targetAllocations: [],
      warnings: [
        `Expected exactly one managed asset for ${config.label}, found ${funds.length}`,
      ],
      idleAmount: 0n,
      investedAmount: 0n,
      totalAmount: 0n,
      canRebalance: false,
    };
  }

  const fund = funds[0];
  const idleAmount = toBigIntAmount(fund.idle_amount);
  const investedAmount = toBigIntAmount(fund.invested_amount);
  const totalAmount = idleAmount + investedAmount;

  if (totalAmount <= 0n) {
    return {
      reason: "no_total",
      instructions: [],
      publicInstructions: [],
      targetAllocations: [],
      warnings,
      idleAmount,
      investedAmount,
      totalAmount,
      canRebalance: false,
    };
  }

  const configuredStrategies = new Set(
    config.strategies.map((strategy) => strategy.address)
  );
  const currentByStrategy = new Map<string, bigint>();

  for (const allocation of fund.strategy_allocations) {
    const amount = toBigIntAmount(allocation.amount);
    currentByStrategy.set(allocation.strategy_address, amount);

    if (!configuredStrategies.has(allocation.strategy_address) && amount > 0n) {
      warnings.push(
        `On-chain strategy ${allocation.strategy_address} has ${amount.toString()} stroops but is not configured for targets`
      );
    }
  }

  const deltas = buildTargets(config, totalAmount, currentByStrategy);
  const targetAllocations = toTargetAllocations(config, deltas);
  const planned =
    config.strategies.length === 1
      ? planSingleStrategy(config, idleAmount)
      : planMultipleStrategies(deltas, idleAmount);

  return {
    ...planned,
    targetAllocations,
    warnings,
    idleAmount,
    investedAmount,
    totalAmount,
    canRebalance: planned.instructions.length > 0,
  };
}
