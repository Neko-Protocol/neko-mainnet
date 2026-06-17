"use client";

import { getStellarWalletKit as getSharedStellarWalletKit } from "@neko/stellar-wallet";
import { getCurrentNetworkPassphrase } from "../network";

/**
 * Kit singleton shared via @neko/stellar-wallet; the web-app passes its own
 * network resolution (which falls back to LOCAL/STANDALONE) instead of the
 * package's plain env read.
 */
export async function getStellarWalletKit() {
  return getSharedStellarWalletKit({
    networkPassphrase: getCurrentNetworkPassphrase(),
  });
}

export const getWallet = () => getStellarWalletKit();
