import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  TransactionBuilder,
  rpc,
  BASE_FEE,
  Operation,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import { resolveVaultIdForApi } from "@/lib/defindex/vaultContract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Per-vault strategy definitions. Vaults not listed here have no strategies to
// invest into (invest step is skipped; fees are still collected).
const VAULT_STRATEGIES: Record<
  string,
  Array<{ name: string; addr: string }>
> = {
  // CETES vault (Neko-managed)
  CCFWKCD52JNSQLN5OS4F7EG6BPDT4IRJV6KODIEIZLWPM35IKHOKT6S2: [
    {
      name: "Neko",
      addr: "CCCEWBCYSIHTGBJ2TUOAFQY63UJ4SWDYTYNAEGXWPB7FP6PRHHGVZJIR",
    },
    {
      name: "Aquarius",
      addr: "CCGV5QSAFRT6OGBZNCE72I6BAODXLDMWEUYAOBI5ZBLHOURSEGVGFTTZ",
    },
    {
      name: "Soroswap",
      addr: "CCY5WW3VXVJDBBXNYXCCH33XTQICHPU6RPFWYJJCT4PTYPN3SXJN2XBJ",
    },
  ],
};

const MIN_IDLE_THRESHOLD = 10_000_000n; // 1 unit (7 decimals)
const COOLDOWN_MS = 5 * 60 * 1000;

// Per-vault cooldown: keyed by vaultId so parallel vaults don't block each other.
const lastInvest = new Map<string, number>();

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  assembledTx: Awaited<ReturnType<DefindexVaultClient["rebalance"]>>,
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string
): Promise<{ hash: string; status: string }> {
  if ((assembledTx.simulation as any)?.error) {
    return {
      hash: "",
      status: `sim_error: ${(assembledTx.simulation as any).error}`,
    };
  }
  const builtTx = TransactionBuilder.fromXDR(
    assembledTx.toXDR(),
    networkPassphrase
  );
  const preparedTx = await server.prepareTransaction(builtTx);
  preparedTx.sign(keypair);
  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status !== "PENDING")
    return { hash: sendResult.hash ?? "", status: "submit_error" };
  const finalStatus = await waitForTx(server, sendResult.hash);
  return { hash: sendResult.hash, status: finalStatus };
}

// ─── Harvest Aquarius rewards ─────────────────────────────────────────────────

async function harvestAquarius(
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string,
  vaultContractId: string
): Promise<{ hash: string; status: string }> {
  const AQUARIUS_STRATEGY =
    "CCGV5QSAFRT6OGBZNCE72I6BAODXLDMWEUYAOBI5ZBLHOURSEGVGFTTZ";

  try {
    const account = await server.getAccount(keypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: AQUARIUS_STRATEGY,
          function: "harvest",
          args: [new Address(vaultContractId).toScVal(), xdr.ScVal.scvVoid()],
        })
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(keypair);
    const sendResult = await server.sendTransaction(prepared);
    if (sendResult.status !== "PENDING")
      return { hash: sendResult.hash ?? "", status: "submit_error" };
    const finalStatus = await waitForTx(server, sendResult.hash);
    return { hash: sendResult.hash, status: finalStatus };
  } catch (e) {
    return { hash: "", status: `error: ${e}` };
  }
}

// ─── Core operations ─────────────────────────────────────────────────────────

async function investIdle(
  client: DefindexVaultClient,
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string,
  strategies: Array<{ name: string; addr: string }>
) {
  if (strategies.length === 0) {
    return { invested: false, results: [], idleAmount: 0 };
  }

  const fundsTx = await client.fetch_total_managed_funds({ simulate: true });
  let funds = fundsTx.result as any;
  if (funds?.tag === "ok") funds = funds.value;
  else if (typeof funds?.unwrap === "function") funds = funds.unwrap();

  const idleAmount = BigInt(funds[0].idle_amount.toString());
  const idleHuman = Number(idleAmount) / 1e7;

  if (idleAmount < MIN_IDLE_THRESHOLD) {
    return { invested: false, results: [], idleAmount: idleHuman };
  }

  const perStrategy = idleAmount / BigInt(strategies.length);
  const remainder = idleAmount % BigInt(strategies.length);
  const results: { strategy: string; hash: string; status: string }[] = [];

  for (let i = 0; i < strategies.length; i++) {
    const { name, addr } = strategies[i];
    const amount = i === 0 ? perStrategy + remainder : perStrategy;
    if (amount === 0n) continue;

    const tx = await client.rebalance({
      caller: keypair.publicKey(),
      instructions: [{ tag: "Invest", values: [addr, amount] }],
    });
    const result = await sendTx(tx as any, keypair, server, networkPassphrase);
    results.push({ strategy: name, ...result });
  }

  return { invested: true, results, idleAmount: idleHuman };
}

async function collectFees(
  client: DefindexVaultClient,
  keypair: Keypair,
  server: rpc.Server,
  networkPassphrase: string
) {
  const results: { step: string; hash: string; status: string }[] = [];

  try {
    const reportTx = await client.report();
    const r = await sendTx(reportTx as any, keypair, server, networkPassphrase);
    results.push({ step: "report", ...r });
    if (r.status !== "SUCCESS") return { results, feesCollected: false };
  } catch (e) {
    results.push({ step: "report", hash: "", status: `error: ${e}` });
    return { results, feesCollected: false };
  }

  try {
    const lockTx = await client.lock_fees({ new_fee_bps: undefined });
    const r = await sendTx(lockTx as any, keypair, server, networkPassphrase);
    results.push({ step: "lock_fees", ...r });
    if (r.status !== "SUCCESS") return { results, feesCollected: false };
  } catch (e) {
    results.push({ step: "lock_fees", hash: "", status: `error: ${e}` });
    return { results, feesCollected: false };
  }

  try {
    const distTx = await client.distribute_fees({
      caller: keypair.publicKey(),
    });
    const r = await sendTx(distTx as any, keypair, server, networkPassphrase);
    results.push({ step: "distribute_fees", ...r });
    return { results, feesCollected: r.status === "SUCCESS" };
  } catch (e) {
    results.push({ step: "distribute_fees", hash: "", status: `error: ${e}` });
    return { results, feesCollected: false };
  }
}

// ─── GET — current vault state ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const vaultId = resolveVaultIdForApi(
      request.nextUrl.searchParams.get("vault")
    );
    if (!vaultId) {
      return NextResponse.json({
        idle: 0,
        total: 0,
        allocations: [],
        canInvest: false,
        cooldownRemaining: 0,
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

    const fundsTx = await client.fetch_total_managed_funds({ simulate: true });
    let funds = fundsTx.result as any;
    if (funds?.tag === "ok") funds = funds.value;
    else if (typeof funds?.unwrap === "function") funds = funds.unwrap();

    const idleAmount = Number(BigInt(funds[0].idle_amount.toString())) / 1e7;
    const totalAmount = Number(BigInt(funds[0].total_amount.toString())) / 1e7;
    const allocations = funds[0].strategy_allocations.map((a: any) => ({
      strategy: a.strategy_address,
      amount: Number(BigInt(a.amount.toString())) / 1e7,
    }));

    return NextResponse.json({
      idle: idleAmount,
      total: totalAmount,
      allocations,
      canInvest: BigInt(funds[0].idle_amount.toString()) >= MIN_IDLE_THRESHOLD,
      cooldownRemaining: Math.max(
        0,
        Math.ceil(
          ((lastInvest.get(vaultId) ?? 0) + COOLDOWN_MS - Date.now()) / 1000
        )
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── POST — invest idle + collect fees (cron or manual) ──────────────────────

export async function POST(request: NextRequest) {
  try {
    let bodyVault: string | null = null;
    try {
      const body = await request.json();
      bodyVault = typeof body?.vault === "string" ? body.vault : null;
    } catch {
      bodyVault = null;
    }
    const vaultId = resolveVaultIdForApi(bodyVault);
    if (!vaultId) {
      return NextResponse.json(
        { error: "No vault configured for this network" },
        { status: 503 }
      );
    }

    const isCron = request.headers.get("x-vercel-cron") === "1";

    if (!isCron) {
      const remaining =
        (lastInvest.get(vaultId) ?? 0) + COOLDOWN_MS - Date.now();
      if (remaining > 0) {
        return NextResponse.json(
          { error: `Please wait ${Math.ceil(remaining / 1000)}s` },
          { status: 429 }
        );
      }
    }

    lastInvest.set(vaultId, Date.now());

    const { secretKey, rpcUrl, networkPassphrase } = getEnv();
    const keypair = Keypair.fromSecret(secretKey);
    const server = new rpc.Server(rpcUrl);
    const client = new DefindexVaultClient({
      contractId: vaultId,
      rpcUrl,
      networkPassphrase,
      publicKey: keypair.publicKey(),
    });

    const strategies = VAULT_STRATEGIES[vaultId] ?? [];

    // Harvest Aquarius rewards only for the CETES vault (which has Aquarius strategy).
    const hasCetesStrategies = strategies.some((s) => s.name === "Aquarius");
    const harvestResult = hasCetesStrategies
      ? await harvestAquarius(keypair, server, networkPassphrase, vaultId)
      : { hash: "", status: "skipped" };

    const investResult = await investIdle(
      client,
      keypair,
      server,
      networkPassphrase,
      strategies
    );

    const feesResult = await collectFees(
      client,
      keypair,
      server,
      networkPassphrase
    );

    const allOk =
      (!investResult.invested ||
        investResult.results.every((r) => r.status === "SUCCESS")) &&
      (feesResult.feesCollected ||
        feesResult.results[0]?.status.startsWith("error"));

    return NextResponse.json(
      {
        success: allOk,
        harvest: harvestResult,
        invest: investResult,
        fees: feesResult,
      },
      { status: allOk ? 200 : 207 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
