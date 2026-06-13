"use client";

import { useCallback, useState } from "react";
import {
  getConfiguredNetworkPassphrase,
  getStellarWalletKit,
} from "./walletKit";
import { useStellarWalletStore } from "./store";

export interface SignTransactionOptions {
  networkPassphrase?: string;
  /** Defaults to the connected address. */
  address?: string;
}

/**
 * One wallet hook for every Neko app: connect/disconnect through the
 * Stellar Wallets Kit modal, connection state persisted under the
 * "stellar-wallet" localStorage key, and transaction signing with the
 * connected account.
 */
export function useStellarWallet() {
  const { address, walletName, setWallet, clearWallet } =
    useStellarWalletStore();
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const Kit = await getStellarWalletKit();
      // v2 authModal returns { address } directly - no callback needed.
      const { address: walletAddress } = await Kit.authModal();
      setWallet({ address: walletAddress, walletName: "Stellar Wallet" });
      return walletAddress;
    } finally {
      setConnecting(false);
    }
  }, [setWallet]);

  const disconnect = useCallback(async () => {
    try {
      const Kit = await getStellarWalletKit();
      await Kit.disconnect();
    } catch {
      // Clearing local state is what matters; kit errors are non-fatal here.
    }
    clearWallet();
  }, [clearWallet]);

  const signTransaction = useCallback(
    async (xdr: string, options?: SignTransactionOptions): Promise<string> => {
      const signer = options?.address ?? address;
      if (!signer) throw new Error("Wallet not connected");
      const Kit = await getStellarWalletKit();
      const { signedTxXdr } = await Kit.signTransaction(xdr, {
        networkPassphrase:
          options?.networkPassphrase ?? getConfiguredNetworkPassphrase(),
        address: signer,
      });
      return signedTxXdr;
    },
    [address]
  );

  return {
    address: address ?? null,
    walletName: walletName ?? null,
    isConnected: Boolean(address),
    connecting,
    connect,
    disconnect,
    signTransaction,
  };
}
