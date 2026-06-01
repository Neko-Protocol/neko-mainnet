import { stellarNetwork } from "@/lib/constants/network";
import { defindexNetworkFromString } from "@neko/keeper";

export const defindexNetworkFromEnv = () =>
  defindexNetworkFromString(stellarNetwork);
