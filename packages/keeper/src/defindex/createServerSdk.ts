import { DefindexSDK } from "@defindex/sdk";

export function createDefindexServerSdk(apiKey: string) {
  return new DefindexSDK({
    apiKey,
  });
}
