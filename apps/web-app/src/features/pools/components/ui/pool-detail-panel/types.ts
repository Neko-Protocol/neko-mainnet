export interface PoolDetailPanelToken {
  symbol: string;
  icon?: string | null;
  address?: string;
}

export interface CollateralOption {
  symbol: string;
  address: string;
  poolId: string;
  decimals: number;
  cFactor: number;
  userBalance: string;
  walletBalance?: string;
}

export interface PoolDetailPanelPool {
  id: string;
  name: string;
  token1: PoolDetailPanelToken;
  token2: PoolDetailPanelToken;
  liquidationLtv: number;
  contractAddress: string;
  network: string;
  totalLiquidity: string;
  totalLiquidityRaw?: string;
  totalBorrowed?: string;
  totalBorrowedRaw?: string;
  supplyApy: string;
  supplyApySub?: string;
  borrowApyLabel?: string;
  poolType?: string;
  poolTypeDetail?: string;
  oraclePrice?: string;
  utilization?: string;
  issuer: { name: string; icon?: string | null };
  collateralBalance?: string;
  loanBalance?: string;
  currentLtv?: number;
  token1Balance?: string;
  token2Balance?: string;
  lpBalance?: string;
  borrowLimit?: string;
  lFactor?: number;
  collateralOptions?: CollateralOption[];
}

export interface PoolDetailPanelProps {
  pool: PoolDetailPanelPool;
  type: "lend" | "borrow";
  isWalletConnected?: boolean;
  supportsBorrow?: boolean;
  depositWithdrawMode?: boolean;
  ammTab?: "deposit" | "withdraw";
  onAmmTabChange?: (t: "deposit" | "withdraw") => void;
  ammAmount?: string;
  ammAmount2?: string;
  ammMaxAmount?: string;
  onAmmAmountChange?: (v: string) => void;
  onAmmSubmit?: () => void | Promise<void>;
  isAmmSubmitting?: boolean;
  ammSubmitDisabled?: boolean;
  ammInsufficientFundsMessage?: string | null;
  canLend?: boolean;
  canBorrow?: boolean;
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onBorrowSubmit?: (
    borrowAmount: string,
    collateralAssetAddress: string,
    collateralAmount: string
  ) => void | Promise<void>;
  isLendingActionPending?: boolean;
}

export type PoolDetailLayoutProps = PoolDetailPanelProps;
