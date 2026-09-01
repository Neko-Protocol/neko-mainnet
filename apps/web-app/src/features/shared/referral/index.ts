// Public API for the shared referral feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { ReferEarnModal } from "./components/ReferEarnModal";
export { ReferralCapture } from "./components/ReferralCapture";
export { ReferralSettingsSection } from "./components/ReferralSettingsSection";
export { useReferralStats } from "./hooks/useReferralStats";
export { useClaimReferral } from "./hooks/useClaimReferral";
export { useReferralStore } from "./stores/referral.store";
