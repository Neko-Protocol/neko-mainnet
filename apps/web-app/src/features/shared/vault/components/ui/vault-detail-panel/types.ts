import type { VaultView } from "@/features/shared/vault/types/vault";
import type { SupportedCurrency } from "@/stores/currency.store";

export type VaultActionTab = "deposit" | "withdraw";

export interface VaultActionPanelProps {
  vault: VaultView;
  tab: VaultActionTab;
  onTabChange: (tab: VaultActionTab) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  isConfirming?: boolean;
  supplyBalance: string;
  sharesBalance: string;
  isWalletConnected: boolean;
  apy?: string;
  tokenPriceInCurrency?: number;
  selectedCurrency?: SupportedCurrency;
}

export interface VaultDetailLayoutProps {
  vault: VaultView;
  initialTab: VaultActionTab;
}
