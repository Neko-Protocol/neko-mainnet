// Public API for the shared legal-consent feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { LegalConsentModalController } from "./components/LegalConsentModalController";
export { useLegalConsentSync } from "./hooks/useLegalConsentSync";
export { useLegalConsentStore } from "./stores/legal-consent.store";
