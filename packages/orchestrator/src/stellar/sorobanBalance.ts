import {
  Contract,
  Address,
  rpc,
  scValToNative,
  TransactionBuilder,
  Horizon,
  Account,
} from "@stellar/stellar-sdk";
import { fromSmallestUnit } from "./tokenUtils.js";
import type { OrchestratorNetwork } from "../config.js";

export interface SorobanBalanceNetwork {
  rpcUrl: string;
  passphrase: string;
  allowHttp?: boolean;
  horizonUrl?: string;
}

function toBalanceNetwork(
  network: SorobanBalanceNetwork | OrchestratorNetwork
): SorobanBalanceNetwork {
  return network as SorobanBalanceNetwork;
}

function simulateBalance(
  contractAddress: string,
  walletAddress: string,
  decimals: number,
  account: Account | { accountId(): string; sequenceNumber(): string },
  network: SorobanBalanceNetwork
): Promise<string> {
  const sorobanRpcServer = new rpc.Server(network.rpcUrl, {
    allowHttp: network.allowHttp ?? false,
  });
  return (async () => {
    const contract = new Contract(contractAddress);
    const operation = contract.call(
      "balance",
      new Address(walletAddress).toScVal()
    );
    const transaction = new TransactionBuilder(account as Account, {
      fee: "100",
      networkPassphrase: network.passphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    const simulated = await sorobanRpcServer.simulateTransaction(transaction);
    const result = simulated as { result?: { retval?: unknown } } | null;
    const retval = result?.result?.retval;
    if (!retval) return "0";
    const balanceValue = scValToNative(
      retval as Parameters<typeof scValToNative>[0]
    );
    const balanceBigInt = BigInt(balanceValue as string);
    return fromSmallestUnit(balanceBigInt.toString(), decimals);
  })().catch((err) => {
    console.warn(
      `[sorobanBalance] Failed for contract ${contractAddress}:`,
      err
    );
    return "0";
  });
}

export async function getTokenBalanceFromContract(
  contractAddress: string,
  walletAddress: string,
  network: SorobanBalanceNetwork | OrchestratorNetwork,
  decimals: number = 7
): Promise<string> {
  const net = toBalanceNetwork(network);
  if (!net.horizonUrl) {
    throw new Error(
      "getTokenBalanceFromContract: network.horizonUrl is required"
    );
  }
  try {
    const horizonServer = new Horizon.Server(net.horizonUrl);
    let account;
    try {
      account = await horizonServer.loadAccount(walletAddress);
    } catch (err) {
      console.warn(`[sorobanBalance] Account ${walletAddress} not found:`, err);
      return "0";
    }
    return simulateBalance(
      contractAddress,
      walletAddress,
      decimals,
      account,
      net
    );
  } catch (err) {
    console.warn(
      `[sorobanBalance] Failed for contract ${contractAddress}:`,
      err
    );
    return "0";
  }
}

export interface BatchTokenInput {
  code: string;
  contract: string;
  decimals: number;
}

/**
 * Fetch balances for multiple tokens in parallel using a single pre-loaded
 * account, eliminating N redundant Horizon loadAccount round-trips.
 */
export async function getBatchedTokenBalances(
  tokens: BatchTokenInput[],
  walletAddress: string,
  accountSequence: string,
  network: SorobanBalanceNetwork | OrchestratorNetwork
): Promise<Record<string, string>> {
  const net = toBalanceNetwork(network);
  const results = await Promise.allSettled(
    tokens.map(async ({ code, contract, decimals }) => {
      if (!contract || code === "XLM") return { code, balance: "0" };
      const account = new Account(walletAddress, accountSequence);
      const balance = await simulateBalance(
        contract,
        walletAddress,
        decimals,
        account,
        net
      );
      return { code, balance };
    })
  );

  const out: Record<string, string> = {};
  for (const r of results) {
    if (r.status === "fulfilled") out[r.value.code] = r.value.balance;
  }
  return out;
}
