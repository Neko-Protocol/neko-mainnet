import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

interface StellarSignOptions {
  networkPassphrase?: string;
  address?: string;
  submit?: boolean;
  submitUrl?: string;
  [key: string]: unknown;
}
import { useQueryClient } from "@tanstack/react-query";
import {
  getStellarWalletKit,
  type MappedBalances,
} from "@/lib/helpers/stellar/wallet";
import storage from "@/lib/helpers/storage";
import { POLL_INTERVAL, STORAGE_KEYS } from "@/lib/constants/wallet";

const getWalletInstance = async () => {
  if (typeof window === "undefined") {
    throw new Error("Wallet can only be accessed in the browser");
  }
  return getStellarWalletKit();
};

const signTransaction = async (xdr: string, options: StellarSignOptions) => {
  const Kit = await getWalletInstance();
  return Kit.signTransaction(xdr, options);
};

export interface WalletContextType {
  address?: string;
  balances: MappedBalances;
  isPending: boolean;
  isFetchingBalances: boolean;
  network?: string;
  networkPassphrase?: string;
  signTransaction: (
    xdr: string,
    options: StellarSignOptions
  ) => Promise<{ signedTxXdr: string }>;

  refetchBalances: () => Promise<void>;
}

const EMPTY_BALANCES: MappedBalances = {};

export const WalletContext = createContext<WalletContextType>({
  isPending: true,
  isFetchingBalances: false,
  balances: EMPTY_BALANCES,
  refetchBalances: async () => {},
  signTransaction,
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [networkPassphrase, setNetworkPassphrase] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const popupLock = useRef(false);
  const queryClient = useQueryClient();

  const balances = EMPTY_BALANCES;
  const isFetchingBalances = false;

  const nullify = () => {
    setAddress(undefined);
    setNetwork(undefined);
    setNetworkPassphrase(undefined);
    storage.setItem(STORAGE_KEYS.walletId, "");
    storage.setItem(STORAGE_KEYS.walletAddress, "");
    storage.setItem(STORAGE_KEYS.walletNetwork, "");
    storage.setItem(STORAGE_KEYS.networkPassphrase, "");
  };

  const updateCurrentWalletState = async () => {
    const walletId = storage.getItem(STORAGE_KEYS.walletId);
    const walletNetwork = storage.getItem(STORAGE_KEYS.walletNetwork);
    const walletAddr = storage.getItem(STORAGE_KEYS.walletAddress);
    const passphrase = storage.getItem(STORAGE_KEYS.networkPassphrase);

    if (
      !address &&
      walletAddr !== null &&
      walletNetwork !== null &&
      passphrase !== null
    ) {
      setAddress(walletAddr);
      setNetwork(walletNetwork);
      setNetworkPassphrase(passphrase);
    }

    if (!walletId) {
      nullify();
    } else {
      if (popupLock.current) return;

      try {
        popupLock.current = true;
        const Kit = await getWalletInstance();
        Kit.setWallet(walletId);
        if (walletId !== "freighter" && walletAddr !== null) return;
        const [a, n] = await Promise.all([Kit.getAddress(), Kit.getNetwork()]);

        if (!a.address) storage.setItem(STORAGE_KEYS.walletId, "");
        if (
          a.address !== address ||
          n.network !== network ||
          n.networkPassphrase !== networkPassphrase
        ) {
          storage.setItem(STORAGE_KEYS.walletAddress, a.address);
          setAddress(a.address);
          setNetwork(n.network);
          setNetworkPassphrase(n.networkPassphrase);
        }
      } catch (e) {
        nullify();

        console.error(e);
      } finally {
        popupLock.current = false;
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const pollWalletState = () => {
      if (!isMounted) return;
      void updateCurrentWalletState();
    };

    startTransition(async () => {
      await updateCurrentWalletState();
    });

    const intervalId = setInterval(pollWalletState, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- it SHOULD only run once per component mount

  const handleRefetchBalances = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["stellar-balances", address],
    });
  }, [queryClient, address]);

  const contextValue = useMemo(
    () => ({
      address,
      network,
      networkPassphrase,
      balances,
      isFetchingBalances,
      refetchBalances: handleRefetchBalances,
      isPending,
      signTransaction,
    }),
    [
      address,
      network,
      networkPassphrase,
      balances,
      isFetchingBalances,
      isPending,
      handleRefetchBalances,
    ]
  );

  return <WalletContext value={contextValue}>{children}</WalletContext>;
};
