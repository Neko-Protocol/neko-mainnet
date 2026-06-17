import { createDefindexServerSdk as pkgCreate } from "@neko/keeper";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";

export const createDefindexServerSdk = () =>
  pkgCreate(getDefindexApiKeyFromEnv());
