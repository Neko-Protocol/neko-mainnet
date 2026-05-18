"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { VaultGrid } from "../ui/VaultGrid";
import { VaultTabs, type VaultTabKey } from "../ui/VaultTabs";
import MyVaultPositions from "../ui/MyVaultPositions";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import { useDefindexVaults } from "../../hooks/useDefindexVaults";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { getTokenIcon } from "@/lib/helpers/tokenUtils";
import type { VaultView } from "../../types/vault";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdDisplayToSelectedCurrency } from "@/lib/helpers/currency";

function vaultAssetFilterIconSrc(v: VaultView): string {
  const addr = v.supplyAsset.contractAddress?.trim();
  if (addr) {
    const fromContract = getTokenIcon(addr);
    if (fromContract) return fromContract;
  }
  const fromSymbol = getTokenIcon(v.supplyAsset.symbol.trim());
  if (fromSymbol) return fromSymbol;
  return v.supplyAsset.iconSrc;
}

const VALID_VAULT_TABS: VaultTabKey[] = ["vaults", "positions"];

const Vault: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as VaultTabKey | null;
  const [activeTab, setActiveTab] = useState<VaultTabKey>(
    tabParam && VALID_VAULT_TABS.includes(tabParam) ? tabParam : "vaults"
  );

  function handleTabChange(tab: VaultTabKey) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "vaults") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        assetDropdownRef.current &&
        !assetDropdownRef.current.contains(e.target as Node)
      ) {
        setAssetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: defindexPayload, isPending, isFetching } = useDefindexVaults();
  const vaultsFromApi = defindexPayload?.vaults ?? [];

  const isVaultListInitialLoad =
    isPending || (isFetching && vaultsFromApi.length === 0);

  const emptyVaultSubtitle = useMemo(() => {
    if (defindexPayload?.error === "missing_defindex_api_key") {
      return (
        defindexPayload.hint ??
        "Set DEFINDEX_API_KEY in .env.local (server-only). DeFindex returns 403 without it."
      );
    }
    if (defindexPayload?.error === "unsupported_network") {
      return "Unsupported network. DeFindex requires Stellar Mainnet.";
    }
    if (defindexPayload?.error === "no_vault_ids") {
      return (
        defindexPayload.hint ??
        "Set DEFINDEX_VAULT_IDS or NEXT_PUBLIC_DEFINDEX_VAULT_IDS with vault contract addresses."
      );
    }
    if (
      vaultsFromApi.length === 0 &&
      defindexPayload?.fetchErrors &&
      defindexPayload.fetchErrors.length > 0
    ) {
      const first = defindexPayload.fetchErrors[0];
      return `DeFindex API: ${first.message} (vault ${first.contractId.slice(0, 8)}…). Check DEFINDEX_API_KEY and network.`;
    }
    return "Try adjusting your filters";
  }, [defindexPayload, vaultsFromApi.length]);

  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const { address } = useWallet();

  // Fetch all vault balances in parallel
  const balanceQueries = useQueries({
    queries: vaultsFromApi.map((v) => ({
      queryKey: ["vaultBalance", v.detail?.contracts?.vault, address],
      queryFn: async () => {
        if (!address || !v.detail?.contracts?.vault) return 0n;
        const client = new DefindexVaultClient({
          contractId: v.detail.contracts.vault,
          rpcUrl,
          networkPassphrase,
          ...(allowHttpForSoroban && { allowHttp: true }),
        });
        const tx = await client.balance({ id: address }, { simulate: true });
        return BigInt(tx.result?.toString() ?? "0");
      },
      enabled: !!address && !!v.detail?.contracts?.vault,
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });

  // Build userBalances map from vault ID to balance
  const userBalances = useMemo(() => {
    const map: Record<string, bigint> = {};
    vaultsFromApi.forEach((vault, idx) => {
      map[vault.id] = balanceQueries[idx]?.data ?? 0n;
    });
    return map;
  }, [vaultsFromApi, balanceQueries]);

  const vaults = useMemo<VaultView[]>(() => {
    if (vaultsFromApi.length === 0) return [];
    return vaultsFromApi.map((v) => ({
      ...v,
      tvl: convertUsdDisplayToSelectedCurrency(v.tvl, fxRate, selectedCurrency),
    }));
  }, [vaultsFromApi, fxRate, selectedCurrency]);

  const assetOptions = useMemo(() => {
    const map = new Map<string, string>();
    vaultsFromApi.forEach((v) => {
      if (v.supplyAsset?.symbol && !map.has(v.supplyAsset.symbol)) {
        map.set(v.supplyAsset.symbol, vaultAssetFilterIconSrc(v));
      }
    });
    const PRIORITY = ["USDC", "EURC"];
    return Array.from(map.entries())
      .map(([symbol, iconSrc]) => ({ symbol, iconSrc }))
      .sort((a, b) => {
        const ai = PRIORITY.indexOf(a.symbol);
        const bi = PRIORITY.indexOf(b.symbol);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [vaultsFromApi]);

  const filteredVaults = useMemo(() => {
    if (!assetFilter) return vaults;
    return vaults.filter((v) => v.supplyAsset?.symbol === assetFilter);
  }, [vaults, assetFilter]);

  const balancePendingByVaultId = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!address) return map;
    vaultsFromApi.forEach((vault, idx) => {
      const q = balanceQueries[idx];
      const canFetchBalance = Boolean(
        address && vault.detail?.contracts?.vault
      );
      if (!q || !canFetchBalance) {
        map[vault.id] = false;
        return;
      }
      map[vault.id] = !q.isFetched;
    });
    return map;
  }, [address, vaultsFromApi, balanceQueries]);

  const vaultFetchingFooterMessage = useMemo(() => {
    const anyBalanceStillLoading =
      Boolean(address) &&
      filteredVaults.some(
        (vault) =>
          !!vault.detail?.contracts?.vault && balancePendingByVaultId[vault.id]
      );

    const listStillRefreshing =
      isFetching && vaultsFromApi.length > 0 && !isPending;

    if (anyBalanceStillLoading || listStillRefreshing) {
      return "Fetching more vaults";
    }
    return null;
  }, [
    address,
    filteredVaults,
    balancePendingByVaultId,
    isFetching,
    vaultsFromApi.length,
    isPending,
  ]);

  const navigateToVault = (v: VaultView, tab: "deposit" | "withdraw") => {
    router.push(`/vaults/${encodeURIComponent(v.id)}?tab=${tab}`);
  };

  return (
    <PageContainer maxWidth="6xl">
      <BannerPage
        title="Vaults"
        subtitle="Deposit assets into yield-generating vaults backed by real-world collateral on Stellar"
        badge="Earn yield"
        imageSrc="/banners/vault.svg"
        imageAlt="Vault illustration"
        className="mb-8"
      />

      <div className="mb-6 w-full min-w-0 flex items-center justify-between gap-4">
        <VaultTabs activeTab={activeTab} onChange={handleTabChange} />
        {activeTab === "vaults" && assetOptions.length >= 2 && (
          <div ref={assetDropdownRef} className="relative shrink-0">
            <button
              onClick={() => setAssetDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-[#1C1C1C] border border-white/10 text-white/70 text-xs rounded-lg pl-3 pr-2.5 py-2 outline-none hover:border-white/20 transition-colors cursor-pointer"
            >
              {assetFilter ? (
                <>
                  <Image
                    src={
                      assetOptions.find((o) => o.symbol === assetFilter)
                        ?.iconSrc ?? ""
                    }
                    alt={assetFilter}
                    width={16}
                    height={16}
                    className="rounded-full"
                    unoptimized
                  />
                  <span>{assetFilter}</span>
                </>
              ) : (
                <span>All assets</span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-white/40 transition-transform ${assetDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {assetDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl bg-[#1C1C1C] border border-white/10 shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    setAssetFilter(null);
                    setAssetDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${!assetFilter ? "text-white" : "text-white/50"}`}
                >
                  All assets
                </button>
                {assetOptions.map(({ symbol, iconSrc }) => (
                  <button
                    key={symbol}
                    onClick={() => {
                      setAssetFilter(symbol);
                      setAssetDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${assetFilter === symbol ? "text-white" : "text-white/50"}`}
                  >
                    <Image
                      src={iconSrc}
                      alt={symbol}
                      width={16}
                      height={16}
                      className="rounded-full"
                      unoptimized
                    />
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === "vaults" ? (
        <VaultGrid
          vaults={filteredVaults}
          isLoading={isVaultListInitialLoad}
          walletAddress={address}
          balancePendingByVaultId={balancePendingByVaultId}
          fetchingFooterMessage={vaultFetchingFooterMessage}
          userBalances={userBalances}
          onDetailsClick={(v) => navigateToVault(v, "deposit")}
          onDepositClick={(v) => navigateToVault(v, "deposit")}
          onWithdrawClick={(v) => navigateToVault(v, "withdraw")}
          emptySubtitle={emptyVaultSubtitle}
        />
      ) : (
        <MyVaultPositions vaults={vaults} userBalances={userBalances} />
      )}
    </PageContainer>
  );
};

export default Vault;
