import { parseDefindexVaultIds, parseAllVaultIds } from "./vaultIds.js";

export function getVaultContractId(): string | null {
  const ids = parseDefindexVaultIds();
  return ids.length > 0 ? ids[0] : null;
}

export function resolveVaultIdForApi(
  requested: string | null | undefined
): string | null {
  const primary = getVaultContractId();
  const allowed = new Set(parseAllVaultIds());
  if (primary) {
    allowed.add(primary);
  }
  const r = requested?.trim();
  if (!r) {
    return primary;
  }
  return allowed.has(r) ? r : null;
}
