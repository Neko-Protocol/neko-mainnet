export const MAX_ASSETS_DISPLAY = 6;

export const TIMESTAMP_MS_PER_SECOND = 1000;

export const ROUTES = {
  STOCKS_BASE: "/discover",

  stockDetail: (symbol: string) => `${ROUTES.STOCKS_BASE}/${symbol}`,
} as const;

export const CHART_ACCENT_COLOR = "#39bfb7";
