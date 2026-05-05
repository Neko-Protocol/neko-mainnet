"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { VaultGrid } from "../ui/VaultGrid";
import { VaultDetailModal } from "../ui/VaultDetailModal";
import { VaultTabs, type VaultTabKey } from "../ui/VaultTabs";
import { VaultActionModal } from "../ui/VaultActionModal";
import MyVaultPositions from "../ui/MyVaultPositions";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import { useDefindexVaults } from "../../hooks/useDefindexVaults";
import { useVaultData } from "../../hooks/useVaultData";
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

const Vault: React.FC = () => {
  const [selectedVault, setSelectedVault] = useState<VaultView | null>(null);
  /** Keeps the vault for deposit/withdraw after closing the detail modal */
  const [pendingActionVault, setPendingActionVault] =
    useState<VaultView | null>(null);
  const [activeTab, setActiveTab] = useState<VaultTabKey>("vaults");
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
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    isDeposit: boolean;
  }>({ open: false, isDeposit: true });

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

  const activeContractId = useMemo(() => {
    return (
      pendingActionVault?.detail?.contracts?.vault ??
      selectedVault?.detail?.contracts?.vault ??
      vaultsFromApi[0]?.detail?.contracts?.vault ??
      null
    );
  }, [pendingActionVault, selectedVault, vaultsFromApi]);

  const { data: liveVaultData } = useVaultData(activeContractId);
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const { address } = useWallet();

  // Fetch APY for each vault in parallel from /api/vault/apy
  const apyQueries = useQueries({
    queries: (vaultsFromApi || []).map((v) => ({
      queryKey: ["vault-apy", v.id],
      queryFn: async (): Promise<number | null> => {
        const res = await fetch(`/api/vault/apy?vault=${v.id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.vaultApy === "number" ? data.vaultApy : null;
      },
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!v.id,
    })),
  });

  // Fetch all vault balances in parallel
  const balanceQueries = useQueries({
    queries: (vaultsFromApi || []).map((v) => ({
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
      staleTime: 30_000,
      refetchInterval: 30_000,
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
    return vaultsFromApi.map((v, idx) => {
      const baseTvl = convertUsdDisplayToSelectedCurrency(
        v.tvl,
        fxRate,
        selectedCurrency
      );

      const liveApyNum = apyQueries[idx]?.data;
      const apy7d =
        liveApyNum != null && liveApyNum > 0
          ? `${liveApyNum.toFixed(2)}%`
          : v.apy7d;

      if (!liveVaultData || !activeContractId) {
        return { ...v, tvl: baseTvl, apy7d };
      }

      if (v.detail?.contracts?.vault !== activeContractId) {
        return { ...v, tvl: baseTvl, apy7d };
      }

      return {
        ...v,
        apy7d,
        tvl: liveVaultData.tvl > 0n ? liveVaultData.tvlFormatted : baseTvl,
        totalSupply:
          liveVaultData.totalShares > 0n
            ? `${(Number(liveVaultData.totalShares) / 1e7).toLocaleString()} shares`
            : v.totalSupply,
      };
    });
  }, [
    vaultsFromApi,
    liveVaultData,
    activeContractId,
    fxRate,
    selectedCurrency,
    apyQueries,
  ]);

  const assetOptions = useMemo(() => {
    const map = new Map<string, string>();
    vaultsFromApi.forEach((v) => {
      if (v.supplyAsset?.symbol && !map.has(v.supplyAsset.symbol)) {
        map.set(v.supplyAsset.symbol, vaultAssetFilterIconSrc(v));
      }
    });
    return Array.from(map.entries())
      .map(([symbol, iconSrc]) => ({ symbol, iconSrc }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [vaultsFromApi]);

  const filteredVaults = useMemo(() => {
    if (!assetFilter) return vaults;
    return vaults.filter((v) => v.supplyAsset?.symbol === assetFilter);
  }, [vaults, assetFilter]);

  const displayVault =
    pendingActionVault ?? selectedVault ?? vaultsFromApi[0] ?? null;

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
      filteredVaults.some((vault) => {
        const idx = vaultsFromApi.findIndex((v) => v.id === vault.id);
        if (idx === -1) return false;
        const q = balanceQueries[idx];
        if (!vault.detail?.contracts?.vault || !q) return false;
        return !q.isFetched;
      });

    const listStillRefreshing =
      isFetching && vaultsFromApi.length > 0 && !isPending;

    if (anyBalanceStillLoading || listStillRefreshing) {
      return "Fetching more vaults";
    }
    return null;
  }, [
    address,
    filteredVaults,
    vaultsFromApi,
    balanceQueries,
    isFetching,
    isPending,
  ]);

  const openDepositModal = (isDeposit = true) =>
    setActionModal({ open: true, isDeposit });

  const closeActionModal = () => {
    setPendingActionVault(null);
    setActionModal({ open: false, isDeposit: true });
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
        <VaultTabs activeTab={activeTab} onChange={setActiveTab} />
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
          onDetailsClick={setSelectedVault}
          onDepositClick={(v) => {
            setSelectedVault(null);
            setPendingActionVault(v);
            openDepositModal(true);
          }}
          onWithdrawClick={(v) => {
            setSelectedVault(null);
            setPendingActionVault(v);
            openDepositModal(false);
          }}
          emptySubtitle={emptyVaultSubtitle}
        />
      ) : (
        <MyVaultPositions
          vaults={vaults}
          userBalances={userBalances}
          onDeposit={(v) => {
            setPendingActionVault(v);
            openDepositModal(true);
          }}
          onWithdraw={(v) => {
            setPendingActionVault(v);
            openDepositModal(false);
          }}
        />
      )}

      {selectedVault && (
        <VaultDetailModal
          vault={selectedVault}
          onClose={() => setSelectedVault(null)}
          onDeposit={() => {
            setPendingActionVault(selectedVault);
            setSelectedVault(null);
            openDepositModal();
          }}
        />
      )}

      {actionModal.open && activeContractId && (
        <VaultActionModal
          key={`${activeContractId}-${actionModal.isDeposit}`}
          vaultContractId={activeContractId}
          isDeposit={actionModal.isDeposit}
          onClose={closeActionModal}
          supplyAssetContractAddress={displayVault?.supplyAsset.contractAddress}
          supplyAssetSymbol={displayVault?.supplyAsset.symbol}
          vaultShareSymbol={displayVault?.name}
        />
      )}
    </PageContainer>
  );
};

export default Vault;
