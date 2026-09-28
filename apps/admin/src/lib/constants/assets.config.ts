import { getCurrentNetworkId, getTokenIconMap } from "@neko-protocol/keeper";

// Admin is mainnet-only, with no network toggle like the web-app has.
const NETWORK_ID = getCurrentNetworkId("mainnet");

export const getAssetIconMap = () => getTokenIconMap(NETWORK_ID);
