import { getCurrentNetworkId, getTokenIconMap } from "@neko/keeper";

// Admin is mainnet-only — no network toggle like the web-app has.
const NETWORK_ID = getCurrentNetworkId("mainnet");

export const getAssetIconMap = () => getTokenIconMap(NETWORK_ID);
