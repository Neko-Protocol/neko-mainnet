"use client";

import { useRef } from "react";
import { useCreateWallet } from "@privy-io/react-auth/extended-chains";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { getStellarWalletKit } from "@/lib/helpers/stellar/wallet";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";

type PrivyUserWithLinkedAccounts = {
  linkedAccounts?: unknown[];
  linked_accounts?: unknown[];
};

type PrivyStellarWallet = {
  address: string;
};

function getAccountValue(account: unknown, key: string) {
  if (!account || typeof account !== "object" || !(key in account)) {
    return undefined;
  }

  return (account as Record<string, unknown>)[key];
}

function getPrivyStellarWallet(
  user: PrivyUserWithLinkedAccounts | null | undefined
): PrivyStellarWallet | null {
  const accounts = user?.linkedAccounts ?? user?.linked_accounts ?? [];

  for (const account of accounts) {
    const type = getAccountValue(account, "type");
    const address = getAccountValue(account, "address");
    const chainType =
      getAccountValue(account, "chainType") ??
      getAccountValue(account, "chain_type");

    if (
      type === "wallet" &&
      chainType === "stellar" &&
      typeof address === "string"
    ) {
      return { address };
    }
  }

  return null;
}

export function useStellarWallet() {
  const { address, walletName, source, setWallet, clearWallet } =
    useStellarWalletStore();
  const { ready, authenticated, user, logout } = usePrivy();
  const { createWallet } = useCreateWallet();
  const privyLoginPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);

  const ensurePrivyStellarWallet = async (
    privyUser: PrivyUserWithLinkedAccounts | null | undefined
  ) => {
    let stellarWallet = getPrivyStellarWallet(privyUser);

    if (!stellarWallet) {
      const { wallet } = await createWallet({ chainType: "stellar" });
      stellarWallet = { address: wallet.address };
    }

    setWallet({
      address: stellarWallet.address,
      walletName: "Privy (Email/Google)",
      source: "privy",
    });
  };

  const { login } = useLogin({
    onComplete: ({ user: loggedInUser }) => {
      if (!privyLoginPromiseRef.current) return;

      void ensurePrivyStellarWallet(loggedInUser)
        .then(() => {
          privyLoginPromiseRef.current?.resolve();
        })
        .catch((error) => {
          privyLoginPromiseRef.current?.reject(error);
        })
        .finally(() => {
          privyLoginPromiseRef.current = null;
        });
    },
    onError: (error) => {
      privyLoginPromiseRef.current?.reject(error);
      privyLoginPromiseRef.current = null;
    },
  });

  const connect = async () => {
    const Kit = await getStellarWalletKit();

    // v2 authModal returns { address } directly — no callback needed.
    const { address: walletAddress } = await Kit.authModal();
    setWallet({
      address: walletAddress,
      walletName: "Stellar Wallet",
      source: "kit",
    });
  };

  const connectWithPrivy = async () => {
    if (!ready) {
      throw new Error("Privy is still initializing");
    }

    if (authenticated) {
      await ensurePrivyStellarWallet(user);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      privyLoginPromiseRef.current = { resolve, reject };
      login({ loginMethods: ["email", "google"] });
    });
  };

  const disconnect = async () => {
    if (source === "privy") {
      await logout();
    } else {
      const Kit = await getStellarWalletKit();
      await Kit.disconnect();
    }

    clearWallet();
  };

  return {
    address: address ?? null,
    walletName: walletName ?? null,
    isConnected: Boolean(address),
    connect,
    connectWithPrivy,
    disconnect,
  };
}
