// Public API for the shared lending feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { default as Lend } from "./components/pages/Lend";
export { useLend } from "./hooks/useLend";
