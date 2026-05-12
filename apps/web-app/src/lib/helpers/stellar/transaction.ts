import { TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { stellarNetwork } from "@/lib/constants/network";

export type SignTransactionFn = (
  xdr: string,
  options?: { networkPassphrase?: string; address?: string }
) => Promise<{ signedTxXdr: string }>;

export async function signAndSendTransaction(
  xdr: string,
  signTransaction: SignTransactionFn,
  options: {
    networkPassphrase: string;
    rpcUrl: string;
    address?: string;
    waitForPending?: boolean;
  }
): Promise<{ hash: string; status: string }> {
  const signed = await signTransaction(xdr, {
    networkPassphrase: options.networkPassphrase,
    address: options.address,
  });
  const tx = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    options.networkPassphrase
  );
  const sorobanServer = new rpc.Server(options.rpcUrl, {
    allowHttp: stellarNetwork === "LOCAL",
  });
  const result = await sorobanServer.sendTransaction(tx);

  if (result.status === "ERROR") {
    throw new Error("Transaction rejected by network");
  }

  const confirmed = await sorobanServer.pollTransaction(result.hash, {
    attempts: 30,
  });

  if (confirmed.status !== "SUCCESS") {
    throw new Error(
      `Transaction failed on-chain (status: ${confirmed.status})`
    );
  }

  return { hash: result.hash, status: confirmed.status };
}
