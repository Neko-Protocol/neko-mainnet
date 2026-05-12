import { xdr, Address, rpc } from "@stellar/stellar-sdk";
import { rpcUrl } from "@/lib/constants/network";
import type { PoolInfo } from "@/lib/orchestrator/types/pool.types";

const sorobanServer = new rpc.Server(rpcUrl, { allowHttp: true });

/**
 * Build the SEP-41 persistent balance ledger key for a Soroban token contract.
 * Key layout: ContractData { contract, key: Vec([Symbol("Balance"), Address(wallet)]), Persistent }
 */
function buildBalanceLedgerKey(
  contractAddress: string,
  walletAddress: string
): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(contractAddress).toScAddress(),
      key: xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol("Balance"),
        new Address(walletAddress).toScVal(),
      ]),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
}

interface LpCandidate {
  poolId: string;
  lpTokenAddress: string;
}

/**
 * Extract LP / share token addresses from the already-fetched pool list.
 * Returns null for pools where no LP token address is available (will be checked anyway).
 */
function extractLpCandidates(pools: PoolInfo[]): LpCandidate[] {
  const candidates: LpCandidate[] = [];
  for (const pool of pools) {
    if (pool.type === "aqua") {
      const addr = pool.metadata?.shareTokenAddress as string | undefined;
      if (addr) candidates.push({ poolId: pool.id, lpTokenAddress: addr });
    } else if (pool.type === "soroswap") {
      const addr = pool.metadata?.poolAddress as string | undefined;
      if (addr) candidates.push({ poolId: pool.id, lpTokenAddress: addr });
    }
    // Blend positions are handled separately via getAllBlendUserPositions
  }
  return candidates;
}

/**
 * Priority 2: Use getLedgerEntries to check all LP/share token balances in ONE
 * RPC call instead of N separate simulateTransaction calls.
 *
 * Returns pool IDs where the user has a non-zero LP balance.
 * Falls back to returning all candidate pool IDs if the RPC call fails.
 */
export async function batchCheckLpBalances(
  pools: PoolInfo[],
  walletAddress: string
): Promise<Set<string>> {
  const candidates = extractLpCandidates(pools);
  if (!candidates.length) return new Set();

  const keys = candidates.map((c) =>
    buildBalanceLedgerKey(c.lpTokenAddress, walletAddress)
  );

  try {
    const response = await sorobanServer.getLedgerEntries(...keys);

    // Absent entries = zero balance. Only entries returned by the RPC exist on-chain.
    const foundContracts = new Set<string>();
    for (const entry of response.entries) {
      try {
        const data = entry.val.contractData();
        const addr = Address.fromScAddress(data.contract()).toString();
        foundContracts.add(addr);
      } catch {
        // Entry decoding failed  ignore this entry
      }
    }

    return new Set(
      candidates
        .filter((c) => foundContracts.has(c.lpTokenAddress))
        .map((c) => c.poolId)
    );
  } catch {
    // RPC failed  assume all candidates may have balances so nothing is skipped
    return new Set(candidates.map((c) => c.poolId));
  }
}
