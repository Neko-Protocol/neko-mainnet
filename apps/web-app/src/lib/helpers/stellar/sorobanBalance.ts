import {
  getTokenBalanceFromContract as getTokenBalanceFromContractOrchestrator,
  getBatchedTokenBalances as getBatchedTokenBalancesOrchestrator,
  type BatchTokenInput,
} from "@neko/orchestrator";
import { rpcUrl, networkPassphrase, horizonUrl } from "@/lib/constants/network";

const sorobanBalanceNetwork = {
  rpcUrl,
  passphrase: networkPassphrase,
  horizonUrl,
  allowHttp: true,
};

export type { BatchTokenInput };

export async function getTokenBalanceFromContract(
  contractAddress: string,
  walletAddress: string,
  decimals: number = 7
): Promise<string> {
  return getTokenBalanceFromContractOrchestrator(
    contractAddress,
    walletAddress,
    sorobanBalanceNetwork,
    decimals
  );
}

export async function getBatchedTokenBalances(
  tokens: BatchTokenInput[],
  walletAddress: string,
  accountSequence: string
): Promise<Record<string, string>> {
  return getBatchedTokenBalancesOrchestrator(
    tokens,
    walletAddress,
    accountSequence,
    sorobanBalanceNetwork
  );
}
