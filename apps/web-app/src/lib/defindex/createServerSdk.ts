import DefindexSDK from "@defindex/sdk";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";

export function createDefindexServerSdk() {
  return new DefindexSDK({
    apiKey: getDefindexApiKeyFromEnv(),
  });
}
