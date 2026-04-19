"use client";

import React, { useMemo, useState } from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { VaultGrid } from "../ui/VaultGrid";
import { VaultDetailModal } from "../ui/VaultDetailModal";
import { VaultTabs, type VaultTabKey } from "../ui/VaultTabs";
import { VaultActionModal } from "../ui/VaultActionModal";
import MyVaultPositions from "../ui/MyVaultPositions";
import { useDefindexVaults } from "../../hooks/useDefindexVaults";
import { useVaultData } from "../../hooks/useVaultData";
import type { VaultView } from "../../types/vault";

const Vault: React.FC = () => {
  const [selectedVault, setSelectedVault] = useState<VaultView | null>(null);
  /** Keeps the vault for deposit/withdraw after closing the detail modal */
  const [pendingActionVault, setPendingActionVault] =
    useState<VaultView | null>(null);
  const [activeTab, setActiveTab] = useState<VaultTabKey>("vaults");
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    isDeposit: boolean;
  }>({ open: false, isDeposit: true });

  const { data: defindexPayload, isLoading, isFetching } = useDefindexVaults();
  const vaultsFromApi = defindexPayload?.vaults ?? [];

  const emptyVaultSubtitle = useMemo(() => {
    if (defindexPayload?.error === "missing_defindex_api_key") {
      return (
        defindexPayload.hint ??
        "Set DEFINDEX_API_KEY in .env.local (server-only). DeFindex returns 403 without it."
      );
    }
    if (defindexPayload?.error === "unsupported_network") {
      return "Unsupported Stellar network for DeFindex. Use PUBLIC (mainnet) or TESTNET.";
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

  const { data: liveVaultData, isLoading: isLoadingLive } =
    useVaultData(activeContractId);

  const vaults = useMemo<VaultView[]>(() => {
    if (vaultsFromApi.length === 0) return [];
    if (!liveVaultData || !activeContractId) return vaultsFromApi;

    return vaultsFromApi.map((v) => {
      if (v.detail?.contracts?.vault !== activeContractId) return v;
      return {
        ...v,
        tvl: liveVaultData.tvl > 0n ? liveVaultData.tvlFormatted : v.tvl,
        totalSupply:
          liveVaultData.totalShares > 0n
            ? `${(Number(liveVaultData.totalShares) / 1e7).toLocaleString()} dfTokens`
            : v.totalSupply,
      };
    });
  }, [vaultsFromApi, liveVaultData, activeContractId]);

  const displayVault =
    pendingActionVault ?? selectedVault ?? vaultsFromApi[0] ?? null;

  const gridLoading = isLoading || isFetching;
  const rowLoading = isLoadingLive && !!activeContractId;

  const openDepositModal = () =>
    setActionModal({ open: true, isDeposit: true });

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

      <div className="mb-6 w-full min-w-0">
        <VaultTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "vaults" ? (
        <VaultGrid
          vaults={vaults}
          isLoading={gridLoading || rowLoading}
          onDetailsClick={setSelectedVault}
          onDepositClick={(v) => {
            setPendingActionVault(null);
            setSelectedVault(v);
            openDepositModal();
          }}
          emptySubtitle={emptyVaultSubtitle}
        />
      ) : (
        <MyVaultPositions
          vaultContractId={activeContractId}
          vault={displayVault}
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
          vaultContractId={activeContractId}
          isDeposit={actionModal.isDeposit}
          onClose={closeActionModal}
          supplyAssetContractAddress={displayVault?.supplyAsset.contractAddress}
          supplyAssetSymbol={displayVault?.supplyAsset.symbol}
        />
      )}
    </PageContainer>
  );
};

export default Vault;
