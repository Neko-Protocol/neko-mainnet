import {
  Contract,
  Address,
  TransactionBuilder,
  Horizon,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import {
  rpcUrl,
  networkPassphrase,
  horizonUrl,
  stellarNetwork,
} from "@/lib/constants/network";
import { toSmallestUnit } from "../tokenUtils";
import { extractContractError } from "./contractErrors";

export const depositToPool = async (
  assetCode: string,
  amount: string,
  decimals: number,
  walletAddress: string,
  contractId: string
): Promise<string> => {
  try {
    const sorobanServer = new rpc.Server(rpcUrl, {
      allowHttp: stellarNetwork === "LOCAL",
    });
    const horizonServer = new Horizon.Server(horizonUrl);
    const lendingContract = new Contract(contractId);

    const amountInSmallestUnit = BigInt(toSmallestUnit(amount, decimals));

    const assetSymbol = xdr.ScVal.scvSymbol(assetCode);

    const operation = lendingContract.call(
      "deposit",
      new Address(walletAddress).toScVal(),
      assetSymbol,
      nativeToScVal(amountInSmallestUnit, { type: "i128" })
    );

    const account = await horizonServer.loadAccount(walletAddress);

    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    try {
      await sorobanServer.simulateTransaction(transaction);
    } catch (simError) {
      const errorMessage =
        simError instanceof Error ? simError.message : String(simError);
      if (
        !errorMessage.includes("Auth") &&
        !errorMessage.includes("require_auth") &&
        !errorMessage.includes("InvalidAction")
      ) {
        const friendlyError = extractContractError(simError, "rwa-lending");
        throw new Error(friendlyError);
      }
    }

    const preparedTx = await sorobanServer.prepareTransaction(transaction);

    return preparedTx.toXDR();
  } catch (error) {
    console.error("Error building deposit transaction:", error);

    if (
      error instanceof Error &&
      error.message &&
      !error.message.includes("Failed to build")
    ) {
      throw error;
    }

    const friendlyError = extractContractError(error, "rwa-lending");
    throw new Error(friendlyError);
  }
};
