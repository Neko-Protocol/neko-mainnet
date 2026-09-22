"use client";

import {
  getStellarWalletKit as getSharedStellarWalletKit,
  type StellarWalletKitOptions,
} from "@neko-protocol/stellar-wallet";
import { getCurrentNetworkPassphrase } from "../network";

/**
 * Kit singleton shared via @neko-protocol/stellar-wallet; the web-app passes its own
 * network resolution (which falls back to LOCAL/STANDALONE) instead of the
 * package's plain env read.
 */
export async function getStellarWalletKit(
  options?: Pick<StellarWalletKitOptions, "includeBridge">
) {
  return getSharedStellarWalletKit({
    networkPassphrase: getCurrentNetworkPassphrase(),
    ...options,
  });
}

export const getWallet = () => getStellarWalletKit();
