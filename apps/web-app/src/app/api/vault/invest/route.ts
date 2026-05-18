import { NextRequest, NextResponse } from "next/server";
import { Keypair, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  getConfiguredRebalanceVaultIds,
  getVaultRebalanceConfig,
  type VaultRebalanceConfig,
} from "@/lib/defindex/rebalanceConfig";
import {
  planVaultRebalance,
  REBALANCE_THRESHOLD_STROOPS,
  type ManagedFundsEntryLike,
  type PlannedInstruction,
  type TargetAllocation,
} from "@/lib/defindex/rebalancePlanner";
import { resolveVaultIdForApi } from "@/lib/defindex/vaultContract";
import { parseAllVaultIds } from "@/lib/defindex/vaultIds";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const COOLDOWN_MS = 5 * 60 * 1000;
const BATCH_TIME_BUDGET_MS = 280 * 1000;
const TX_TIME_RESERVE_MS = 55 * 1000;

// Per-vault cooldown: keyed by vaultId so parallel vaults don't block each other.
const lastInvest = new Map<string, number>();

type AssembledTxLike = {
  simulation?: { error?: unknown };
  toXDR(): string;
};

type SdkResult = {
  tag?: string;
  value?: unknown;
  unwrap?: () => unknown;
};

type TxResult = {
  hash: string;
  status: string;
};

type FeesSummary = {
  attempted: boolean;
  results: Array<TxResult & { step: string }>;
  feesCollected: boolean;
};

type RebalanceSummary = {
  attempted: boolean;
  reason: string;
  instructions: PlannedInstruction[];
  hash: string;
  status: string;
  idleAmount: number;
  idleAmountStroops: string;
  totalAmount: number;
  totalAmountStroops: string;
  targetAllocations: TargetAllocation[];
  canRebalance: boolean;
};

type VaultKeeperResult = {
  vaultId: string;
  label: string;
  success: boolean;
  rebalance: RebalanceSummary;
  fees: FeesSummary;
  warnings: string[];
};

type KeeperMode = "single" | "batch";

function getEnv() {
  const secretKey = process.env.VAULT_MANAGER_SECRET_KEY;
  if (!secretKey) throw new Error("VAULT_MANAGER_SECRET_KEY not configured");
  return {
    secretKey,
    rpcUrl:
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
      "https://soroban-testnet.stellar.org",
    networkPassphrase:
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015",
  };
}

function unwrapSdkResult(raw: unknown): unknown {
  const r = raw as SdkResult;
  if (r?.tag === "ok") return r.value;
  if (typeof r?.unwrap === "function") return r.unwrap();
  return raw;
}

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function amountToHuman(amount: bigint): number {
  return Number(amount) / 1e7;
}

function cooldownRemainingSeconds(vaultId: string): number {
  return Math.max(
    0,
    Math.ceil(
      ((lastInvest.get(vaultId) ?? 0) + COOLDOWN_MS - Date.now()) / 1000
    )
  );
}

function hasTransactionBudget(deadlineMs?: number): boolean {
  if (!deadlineMs) return true;
  return Date.now() + TX_TIME_RESERVE_MS < deadlineMs;
}

function emptyFeesSummary(): FeesSummary {
  return { attempted: false, results: [], feesCollected: false };
}

function skippedRebalanceSummary(
  reason: string,
  plan?: {
    publicInstructions?: PlannedInstruction[];
    targetAllocations?: TargetAllocation[];
    idleAmount?: bigint;
    totalAmount?: bigint;
    canRebalance?: boolean;
  }
): RebalanceSummary {
  const idleAmount = plan?.idleAmount ?? 0n;
  const totalAmount = plan?.totalAmount ?? 0n;
  return {
    attempted: false,
    reason,
    instructions: plan?.publicInstructions ?? [],
    hash: "",
    status: "skipped",
    idleAmount: amountToHuman(idleAmount),
    idleAmountStroops: idleAmount.toString(),
    totalAmount: amountToHuman(totalAmount),
    totalAmountStroops: totalAmount.toString(),
    targetAllocations: plan?.targetAllocations ?? [],
    canRebalance: plan?.canRebalance ?? false,
  };
}

async function waitForTx(
  server: rpc.Server,
  hash: string
): Promise<"SUCCESS" | "FAILED" | "TIMEOUT"> {
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await server.getTransaction(hash);
    if (status.status === "SUCCESS") return "SUCCESS";
    if (status.status === "FAILED") return "FAILED";
  }
  return "TIMEOUT";
}

async function sendTx(
  assembledTx: AssembledTxLike,
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string
): Promise<TxResult> {
  if (assembledTx.simulation?.error) {
    return {
      hash: "",
      status: `sim_error: ${errorToString(assembledTx.simulation.error)}`,
    };
  }

  const builtTx = TransactionBuilder.fromXDR(
    assembledTx.toXDR(),
    networkPassphrase
  );
  const preparedTx = await server.prepareTransaction(builtTx);
  preparedTx.sign(keypair);
  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status !== "PENDING") {
    return { hash: sendResult.hash ?? "", status: "submit_error" };
  }
  const finalStatus = await waitForTx(server, sendResult.hash);
  return { hash: sendResult.hash, status: finalStatus };
}

async function fetchManagedFunds(
  client: DefindexVaultClient
): Promise<ManagedFundsEntryLike[]> {
  const fundsTx = await client.fetch_total_managed_funds({ simulate: true });
  return unwrapSdkResult(fundsTx.result) as ManagedFundsEntryLike[];
}

async function collectFees(
  client: DefindexVaultClient,
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string,
  deadlineMs?: number
): Promise<FeesSummary> {
  const results: Array<TxResult & { step: string }> = [];

  if (!hasTransactionBudget(deadlineMs)) {
    results.push({
      step: "report",
      hash: "",
      status: "skipped_timeout_budget",
    });
    return { attempted: true, results, feesCollected: false };
  }

  try {
    const reportTx = await client.report();
    const r = await sendTx(
      reportTx as AssembledTxLike,
      keypair,
      server,
      networkPassphrase
    );
    results.push({ step: "report", ...r });
    if (r.status !== "SUCCESS") {
      return { attempted: true, results, feesCollected: false };
    }
  } catch (e) {
    results.push({
      step: "report",
      hash: "",
      status: `error: ${errorToString(e)}`,
    });
    return { attempted: true, results, feesCollected: false };
  }

  if (!hasTransactionBudget(deadlineMs)) {
    results.push({
      step: "lock_fees",
      hash: "",
      status: "skipped_timeout_budget",
    });
    return { attempted: true, results, feesCollected: false };
  }

  try {
    const lockTx = await client.lock_fees({ new_fee_bps: undefined });
    const r = await sendTx(
      lockTx as AssembledTxLike,
      keypair,
      server,
      networkPassphrase
    );
    results.push({ step: "lock_fees", ...r });
    if (r.status !== "SUCCESS") {
      return { attempted: true, results, feesCollected: false };
    }
  } catch (e) {
    results.push({
      step: "lock_fees",
      hash: "",
      status: `error: ${errorToString(e)}`,
    });
    return { attempted: true, results, feesCollected: false };
  }

  if (!hasTransactionBudget(deadlineMs)) {
    results.push({
      step: "distribute_fees",
      hash: "",
      status: "skipped_timeout_budget",
    });
    return { attempted: true, results, feesCollected: false };
  }

  try {
    const distTx = await client.distribute_fees({
      caller: keypair.publicKey(),
    });
    const r = await sendTx(
      distTx as AssembledTxLike,
      keypair,
      server,
      networkPassphrase
    );
    results.push({ step: "distribute_fees", ...r });
    return { attempted: true, results, feesCollected: r.status === "SUCCESS" };
  } catch (e) {
    results.push({
      step: "distribute_fees",
      hash: "",
      status: `error: ${errorToString(e)}`,
    });
    return { attempted: true, results, feesCollected: false };
  }
}

function buildRebalanceSummary(
  plan: ReturnType<typeof planVaultRebalance>,
  txResult?: TxResult
): RebalanceSummary {
  const attempted = plan.instructions.length > 0;

  return {
    attempted,
    reason: plan.reason,
    instructions: plan.publicInstructions,
    hash: txResult?.hash ?? "",
    status: attempted ? (txResult?.status ?? "not_submitted") : "skipped",
    idleAmount: amountToHuman(plan.idleAmount),
    idleAmountStroops: plan.idleAmount.toString(),
    totalAmount: amountToHuman(plan.totalAmount),
    totalAmountStroops: plan.totalAmount.toString(),
    targetAllocations: plan.targetAllocations,
    canRebalance: plan.canRebalance,
  };
}

function skippedVaultResult(
  config: VaultRebalanceConfig,
  reason: string,
  warning?: string
): VaultKeeperResult {
  return {
    vaultId: config.vaultId,
    label: config.label,
    success: false,
    rebalance: skippedRebalanceSummary(reason),
    fees: emptyFeesSummary(),
    warnings: warning ? [warning] : [],
  };
}

async function runVaultKeeper(
  config: VaultRebalanceConfig,
  keypair: Keypair,
  server: rpc.Server,
  rpcUrl: string,
  networkPassphrase: string,
  deadlineMs?: number
): Promise<VaultKeeperResult> {
  const warnings: string[] = [];
  const client = new DefindexVaultClient({
    contractId: config.vaultId,
    rpcUrl,
    networkPassphrase,
    publicKey: keypair.publicKey(),
  });

  try {
    const funds = await fetchManagedFunds(client);
    const plan = planVaultRebalance(config, funds);
    warnings.push(...plan.warnings);

    let rebalanceTx: TxResult | undefined;
    if (plan.instructions.length > 0 && hasTransactionBudget(deadlineMs)) {
      const tx = await client.rebalance({
        caller: keypair.publicKey(),
        instructions: plan.instructions,
      });
      rebalanceTx = await sendTx(
        tx as AssembledTxLike,
        keypair,
        server,
        networkPassphrase
      );
      if (rebalanceTx.status !== "SUCCESS") {
        warnings.push(`Rebalance returned ${rebalanceTx.status}`);
      }
    } else if (plan.instructions.length > 0) {
      rebalanceTx = { hash: "", status: "skipped_timeout_budget" };
      warnings.push("Rebalance skipped because the batch was close to timeout");
    }

    const fees = await collectFees(
      client,
      keypair,
      server,
      networkPassphrase,
      deadlineMs
    );
    if (!fees.feesCollected) {
      warnings.push("Fee collection did not complete successfully");
    }

    const rebalance = buildRebalanceSummary(plan, rebalanceTx);
    const rebalanceOk = !rebalance.attempted || rebalance.status === "SUCCESS";

    return {
      vaultId: config.vaultId,
      label: config.label,
      // Fee distribution can fail because of protocol receiver setup, e.g. a
      // missing trustline outside our vaults. Keep it visible in warnings, but
      // do not fail the keeper when rebalance/invest itself succeeded.
      success: rebalanceOk,
      rebalance,
      fees,
      warnings,
    };
  } catch (e) {
    const message = errorToString(e);
    return {
      vaultId: config.vaultId,
      label: config.label,
      success: false,
      rebalance: skippedRebalanceSummary("error"),
      fees: emptyFeesSummary(),
      warnings: [...warnings, message],
    };
  }
}

function legacyAliases(first: VaultKeeperResult | undefined) {
  if (!first) {
    return {
      invested: false,
      results: [],
      idleAmount: 0,
      message: "No vault processed",
    };
  }

  const result = first.rebalance.attempted
    ? [
        {
          strategy: first.label,
          hash: first.rebalance.hash,
          status: first.rebalance.status,
        },
      ]
    : [];

  return {
    invested: first.rebalance.attempted,
    results: result,
    idleAmount: first.rebalance.idleAmount,
    message: first.rebalance.attempted
      ? undefined
      : first.rebalance.reason.replaceAll("_", " "),
  };
}

function configuredBatchVaults(): VaultRebalanceConfig[] {
  const allowed = new Set(parseAllVaultIds());
  return getConfiguredRebalanceVaultIds()
    .filter((vaultId) => allowed.has(vaultId))
    .map((vaultId) => getVaultRebalanceConfig(vaultId))
    .filter((config): config is VaultRebalanceConfig => Boolean(config));
}

function isCronRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  return (
    request.headers.get("x-vercel-cron") === "1" ||
    userAgent.includes("vercel-cron/1.0")
  );
}

async function executeKeeper(
  configs: VaultRebalanceConfig[],
  mode: KeeperMode,
  isCron: boolean
) {
  if (configs.length === 0) {
    return NextResponse.json(
      { error: "No rebalance config found for requested vaults" },
      { status: 503 }
    );
  }

  if (mode === "single" && !isCron) {
    const remaining = cooldownRemainingSeconds(configs[0].vaultId);
    if (remaining > 0) {
      return NextResponse.json(
        { error: `Please wait ${remaining}s` },
        { status: 429 }
      );
    }
  }

  const { secretKey, rpcUrl, networkPassphrase } = getEnv();
  const keypair = Keypair.fromSecret(secretKey);
  const server = new rpc.Server(rpcUrl);
  const startedAt = Date.now();
  const deadlineMs = startedAt + BATCH_TIME_BUDGET_MS;
  const vaults: VaultKeeperResult[] = [];

  for (const config of configs) {
    if (!hasTransactionBudget(deadlineMs)) {
      vaults.push(
        skippedVaultResult(
          config,
          "skipped_timeout_budget",
          "Skipped because the batch was close to the Vercel duration budget"
        )
      );
      continue;
    }

    if (mode === "batch" && !isCron) {
      const remaining = cooldownRemainingSeconds(config.vaultId);
      if (remaining > 0) {
        vaults.push(
          skippedVaultResult(
            config,
            "skipped_cooldown",
            `Please wait ${remaining}s`
          )
        );
        continue;
      }
    }

    lastInvest.set(config.vaultId, Date.now());
    vaults.push(
      await runVaultKeeper(
        config,
        keypair,
        server,
        rpcUrl,
        networkPassphrase,
        deadlineMs
      )
    );
  }

  const success = vaults.every((vault) => vault.success);
  const payload = {
    success,
    mode,
    vaults,
    ...(mode === "single" ? legacyAliases(vaults[0]) : {}),
  };

  return NextResponse.json(payload, { status: success ? 200 : 207 });
}

// ─── GET - current vault state ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    if (isCronRequest(request)) {
      return executeKeeper(configuredBatchVaults(), "batch", true);
    }

    const requestedVault = request.nextUrl.searchParams.get("vault");
    const vaultId = resolveVaultIdForApi(requestedVault);

    if (!vaultId) {
      return NextResponse.json(
        {
          error: requestedVault
            ? "Vault is not configured for this network"
            : "No vault configured for this network",
          idle: 0,
          total: 0,
          allocations: [],
          targetAllocations: [],
          instructions: [],
          canInvest: false,
          canRebalance: false,
          cooldownRemaining: 0,
        },
        { status: requestedVault ? 400 : 200 }
      );
    }

    const config = getVaultRebalanceConfig(vaultId);
    if (!config) {
      return NextResponse.json({
        idle: 0,
        total: 0,
        allocations: [],
        targetAllocations: [],
        instructions: [],
        canInvest: false,
        canRebalance: false,
        cooldownRemaining: cooldownRemainingSeconds(vaultId),
        configured: false,
      });
    }

    const { secretKey, rpcUrl, networkPassphrase } = getEnv();
    const keypair = Keypair.fromSecret(secretKey);
    const client = new DefindexVaultClient({
      contractId: vaultId,
      rpcUrl,
      networkPassphrase,
      publicKey: keypair.publicKey(),
    });

    const funds = await fetchManagedFunds(client);
    const plan = planVaultRebalance(config, funds);
    const firstFund = funds[0];
    const allocations = (firstFund?.strategy_allocations ?? []).map((a) => ({
      strategy: a.strategy_address,
      amount: amountToHuman(BigInt(a.amount.toString())),
      amountStroops: a.amount.toString(),
    }));

    return NextResponse.json({
      idle: plan.idleAmount ? amountToHuman(plan.idleAmount) : 0,
      idleStroops: plan.idleAmount.toString(),
      total: plan.totalAmount ? amountToHuman(plan.totalAmount) : 0,
      totalStroops: plan.totalAmount.toString(),
      allocations,
      targetAllocations: plan.targetAllocations,
      instructions: plan.publicInstructions,
      reason: plan.reason,
      warnings: plan.warnings,
      canInvest: plan.idleAmount >= REBALANCE_THRESHOLD_STROOPS,
      canRebalance: plan.canRebalance,
      cooldownRemaining: cooldownRemainingSeconds(vaultId),
      configured: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── POST - rebalance idle/drift + collect fees (cron or manual) ─────────────

export async function POST(request: NextRequest) {
  try {
    let bodyVault: string | null = null;
    try {
      const body = (await request.json()) as { vault?: unknown } | null;
      bodyVault = typeof body?.vault === "string" ? body.vault.trim() : null;
      if (bodyVault === "") bodyVault = null;
    } catch {
      bodyVault = null;
    }

    const isCron = isCronRequest(request);
    const mode: KeeperMode = bodyVault ? "single" : "batch";
    const configs =
      mode === "single"
        ? (() => {
            const vaultId = resolveVaultIdForApi(bodyVault);
            if (!vaultId) return null;
            const config = getVaultRebalanceConfig(vaultId);
            return config ? [config] : [];
          })()
        : configuredBatchVaults();

    if (configs === null) {
      return NextResponse.json(
        { error: "Vault is not configured for this network" },
        { status: 400 }
      );
    }

    return executeKeeper(configs, mode, isCron);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
