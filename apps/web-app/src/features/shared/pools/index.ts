// Public API for the shared pools feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { default as UnifiedPoolsPage } from "./components/pages/UnifiedPoolsPage";
export { default as PoolDetail } from "./components/pages/PoolDetail";
export { usePoolDetail } from "./hooks/usePoolDetail";
export { usePoolActivity } from "./hooks/usePoolActivity";
export { usePoolRateHistory } from "./hooks/usePoolRateHistory";
