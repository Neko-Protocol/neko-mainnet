export const DEBOUNCE_MS = 50;

export const QUOTE_REFRESH_INTERVAL_MS = 5000;

export const DEFAULT_SLIPPAGE_BPS = 500;

export const MAX_HOPS = 3;

export const SUSPICIOUS_VALUE_THRESHOLD_PCT = 10;

export const ORDER_HISTORY_LIMIT = 20;

// Platform fee charged on swaps routed through Soroswap (50 bps = 0.5%)
export const PLATFORM_FEE_BPS = 50;

export const NEKO_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_NEKO_TREASURY_ADDRESS?.trim() ?? "";
