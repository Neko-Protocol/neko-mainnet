export function getDefindexApiKeyFromEnv(): string {
  return process.env.DEFINDEX_API_KEY?.trim() ?? "";
}
