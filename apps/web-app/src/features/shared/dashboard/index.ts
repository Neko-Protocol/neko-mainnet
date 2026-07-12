// Public API for the shared dashboard feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { default as MainStats } from "./components/ui/MainStats";
export { default as DiscoverAssets } from "./components/ui/DiscoverAssets";
export { EmailNudgeBanner } from "./components/ui/EmailNudgeBanner";
export { useHighestVaultApy } from "./hooks/useHighestVaultApy";
export { usePortfolioValue } from "./hooks/usePortfolioValue";
export { useTotalPortfolioUsd } from "./hooks/useTotalPortfolioUsd";
