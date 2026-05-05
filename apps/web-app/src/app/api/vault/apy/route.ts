import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import { resolveVaultIdForApi } from "@/lib/defindex/vaultContract";
import { createDefindexServerSdk } from "@/lib/defindex/createServerSdk";
import { defindexNetworkFromEnv } from "@/lib/defindex/network";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// CETES vault — the only vault with custom per-strategy APY getters.
const CETES_VAULT_ID =
  "CCFWKCD52JNSQLN5OS4F7EG6BPDT4IRJV6KODIEIZLWPM35IKHOKT6S2";
const NEKO_POOL_CONTRACT =
  "CB4HAFD6ECCOQZXOD6FXUVDM3E773LKR5JHVGA3DBJXIWHZUWX2THEDJ";
const AQUARIUS_POOL =
  "CBJPT2SCZSUJQGBZHHCHLZJX3GVYLOPVUKF53ESH4NFQZMC2UFPDWHRI";
const AQUARIUS_STRATEGY =
  "CCGV5QSAFRT6OGBZNCE72I6BAODXLDMWEUYAOBI5ZBLHOURSEGVGFTTZ";
const SOROSWAP_STRATEGY =
  "CCY5WW3VXVJDBBXNYXCCH33XTQICHPU6RPFWYJJCT4PTYPN3SXJN2XBJ";
const NEKO_STRATEGY =
  "CCCEWBCYSIHTGBJ2TUOAFQY63UJ4SWDYTYNAEGXWPB7FP6PRHHGVZJIR";

const SCALAR_7 = 10_000_000;

function getRpcConfig() {
  return {
    rpcUrl:
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
      "https://soroban-testnet.stellar.org",
    networkPassphrase:
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015",
  };
}

// ─── Neko APY ─────────────────────────────────────────────────────────────────

async function getNekoApy(
  server: rpc.Server,
  networkPassphrase: string,
  managerPublicKey: string
): Promise<number | null> {
  try {
    const account = await server.getAccount(managerPublicKey);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: NEKO_POOL_CONTRACT,
          function: "get_interest_rate",
          args: [nativeToScVal("CETES", { type: "symbol" })],
        })
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return null;

    const raw = scValToNative(sim.result!.retval);
    const aprRaw: bigint =
      typeof raw === "object" && raw !== null && "ok" in raw
        ? BigInt(raw.ok)
        : typeof raw === "bigint"
          ? raw
          : BigInt(String(raw));

    const apr = Number(aprRaw) / SCALAR_7;
    const apy = Math.pow(1 + apr / 365, 365) - 1;
    return apy * 100;
  } catch {
    return null;
  }
}

// ─── Aquarius APY ─────────────────────────────────────────────────────────────

async function getAquariusApy(): Promise<number | null> {
  try {
    const isTestnet =
      (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET") !== "PUBLIC";
    const base = isTestnet
      ? "https://amm-api-testnet.aqua.network"
      : "https://amm-api.aqua.network";

    const res = await fetch(`${base}/pools/?address__in=${AQUARIUS_POOL}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pool = data?.items?.[0];
    if (!pool) return null;

    return parseFloat(pool.total_apy) * 100;
  } catch {
    return null;
  }
}

// ─── Soroswap APY ─────────────────────────────────────────────────────────────

async function getSoroswapApy(): Promise<number | null> {
  return null;
}

// ─── Vault allocations ────────────────────────────────────────────────────────

async function getAllocations(
  client: DefindexVaultClient
): Promise<Record<string, number>> {
  const fundsTx = await client.fetch_total_managed_funds({ simulate: true });
  let funds = fundsTx.result as any;
  if (funds?.tag === "ok") funds = funds.value;
  else if (typeof funds?.unwrap === "function") funds = funds.unwrap();

  const total = Number(BigInt(funds[0].total_amount.toString()));
  if (total === 0) return {};

  const result: Record<string, number> = {};
  for (const alloc of funds[0].strategy_allocations) {
    const addr: string = alloc.strategy_address;
    const amount = Number(BigInt(alloc.amount.toString()));
    result[addr] = amount / total;
  }
  return result;
}

// ─── DefIndex SDK APY ─────────────────────────────────────────────────────────

async function getDefindexVaultApy(vaultId: string): Promise<number | null> {
  try {
    const sdk = createDefindexServerSdk();
    const network = defindexNetworkFromEnv();
    if (!network) return null;
    const result = await sdk.getVaultAPY(vaultId, network);
    return typeof result?.apy === "number" ? result.apy : null;
  } catch {
    return null;
  }
}

// ─── GET /api/vault/apy ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const vaultId = resolveVaultIdForApi(
      request.nextUrl.searchParams.get("vault")
    );
    if (!vaultId) {
      return NextResponse.json({
        vaultApy: null,
        strategies: [],
        note: "No vault configured for this network.",
      });
    }

    const secretKey = process.env.VAULT_MANAGER_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    // For all vaults, try the DeFindex SDK APY first.
    const defindexApy = await getDefindexVaultApy(vaultId);

    // For the CETES vault only, also compute manual weighted APY from on-chain
    // strategy data as a fallback when the SDK does not return a value.
    if (vaultId === CETES_VAULT_ID) {
      const { rpcUrl, networkPassphrase } = getRpcConfig();
      const keypair = Keypair.fromSecret(secretKey);
      const server = new rpc.Server(rpcUrl);

      const client = new DefindexVaultClient({
        contractId: vaultId,
        rpcUrl,
        networkPassphrase,
        publicKey: keypair.publicKey(),
      });

      const [nekoApy, aquariusApy, soroswapApy, allocations] =
        await Promise.all([
          getNekoApy(server, networkPassphrase, keypair.publicKey()),
          getAquariusApy(),
          getSoroswapApy(),
          getAllocations(client),
        ]);

      const strategies = [
        {
          name: "Neko",
          address: NEKO_STRATEGY,
          apy: nekoApy,
          weight: allocations[NEKO_STRATEGY] ?? 0,
        },
        {
          name: "Aquarius",
          address: AQUARIUS_STRATEGY,
          apy: aquariusApy,
          weight: allocations[AQUARIUS_STRATEGY] ?? 0,
        },
        {
          name: "Soroswap",
          address: SOROSWAP_STRATEGY,
          apy: soroswapApy,
          weight: allocations[SOROSWAP_STRATEGY] ?? 0,
        },
      ];

      const knownStrategies = strategies.filter((s) => s.apy !== null);
      const totalKnownWeight = knownStrategies.reduce(
        (sum, s) => sum + s.weight,
        0
      );

      let manualVaultApy: number | null = null;
      if (knownStrategies.length > 0 && totalKnownWeight > 0) {
        manualVaultApy = knownStrategies.reduce((sum, s) => {
          const normalizedWeight = s.weight / totalKnownWeight;
          return sum + s.apy! * normalizedWeight;
        }, 0);
      }

      const vaultApy = defindexApy ?? manualVaultApy;

      return NextResponse.json({
        vaultApy: vaultApy !== null ? parseFloat(vaultApy.toFixed(4)) : null,
        strategies: strategies.map((s) => ({
          name: s.name,
          apy: s.apy !== null ? parseFloat(s.apy.toFixed(4)) : null,
          weight: parseFloat((s.weight * 100).toFixed(4)),
        })),
        note:
          soroswapApy === null
            ? "Soroswap APY not available — trading fee yield requires volume data"
            : undefined,
      });
    }

    // All other vaults: SDK APY only, no on-chain strategy data.
    return NextResponse.json({
      vaultApy:
        defindexApy !== null ? parseFloat(defindexApy.toFixed(4)) : null,
      strategies: [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
