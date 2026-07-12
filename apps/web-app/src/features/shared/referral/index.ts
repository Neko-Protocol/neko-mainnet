// Public API for the shared referral feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { ReferEarnModal } from "./components/ReferEarnModal";
export { ReferralCapture } from "./components/ReferralCapture";
export { useReferralStats } from "./hooks/useReferralStats";
export { useReferralStore } from "./stores/referral.store";
