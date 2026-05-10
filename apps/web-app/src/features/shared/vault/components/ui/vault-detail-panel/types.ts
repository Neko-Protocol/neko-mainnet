import type { VaultView } from "@/features/shared/vault/types/vault";

export type VaultActionTab = "deposit" | "withdraw";

export interface VaultActionPanelProps {
  vault: VaultView;
  tab: VaultActionTab;
  onTabChange: (tab: VaultActionTab) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  supplyBalance: string;
  sharesBalance: string;
  isWalletConnected: boolean;
  apy?: string;
  tokenPriceUsd?: number;
}

export interface VaultDetailLayoutProps {
  vault: VaultView;
  initialTab: VaultActionTab;
}
