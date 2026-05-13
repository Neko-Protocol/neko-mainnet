import {
  Horizon,
  TransactionBuilder,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { horizonUrl, networkPassphrase } from "@/lib/constants/network";

const horizonServer = new Horizon.Server(horizonUrl);

/**
 * Decode a transaction envelope and extract every Soroban contract address
 * that was directly invoked (invokeHostFunction → invokeContract).
 */
function extractInvokedContracts(envelopeXdr: string): string[] {
  const contracts: string[] = [];
  try {
    const tx = TransactionBuilder.fromXDR(envelopeXdr, networkPassphrase);
    if (!("operations" in tx)) return contracts; // FeeBumpTransaction  skip
    for (const op of tx.operations) {
      if (op.type !== "invokeHostFunction") continue;
      try {
        const func = (op as { func: xdr.HostFunction }).func;
        if (func.switch().name !== "hostFunctionTypeInvokeContract") continue;
        const invokeArgs = func.invokeContract();
        const contractAddr = Address.fromScAddress(
          invokeArgs.contractAddress()
        ).toString();
        contracts.push(contractAddr);
      } catch {
        // Individual op decode failures are non-fatal
      }
    }
  } catch {
    // XDR decode failure  skip this tx
  }
  return contracts;
}

/**
 * Scan the user's recent Horizon transactions and return the set of
 * Soroban contract addresses they have directly invoked.
 *
 * Cached externally via React Query (staleTime: 10 min) so this only
 * runs once per session in practice.
 */
export async function scanUserContractInteractions(
  address: string
): Promise<Set<string>> {
  const known = new Set<string>();
  try {
    const page = await horizonServer
      .transactions()
      .forAccount(address)
      .limit(50)
      .order("desc")
      .call();

    for (const tx of page.records) {
      if (!tx.envelope_xdr) continue;
      for (const contract of extractInvokedContracts(tx.envelope_xdr)) {
        known.add(contract);
      }
    }
  } catch {
    // Horizon unavailable  return empty set, callers fall back to full check
  }
  return known;
}
