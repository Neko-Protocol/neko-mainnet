import "server-only";
import type { Asset, Network } from "oppia-swap-kit";
import { stellarNetwork } from "@/lib/constants/network";
import { getSwappableTokens } from "./tokens";

/**
 * Oppia only models the two public networks. Standalone/futurenet have no
 * provider coverage, so they resolve to testnet rather than silently quoting
 * against mainnet liquidity.
 */
export function getSwapNetwork(): Network {
  return stellarNetwork === "PUBLIC" ? "mainnet" : "testnet";
}

/**
 * Neko's curated assets as Oppia `Asset` objects, keyed by token code.
 *
 * Decimals come from the asset registry, never a default of seven: JTRSY and
 * the Centrifuge share classes are 18-decimal contract tokens and GYEN is 6,
 * so assuming seven would misprice the amount by orders of magnitude.
 *
 * Only assets with a verified issuer carry a `classic` mapping. Oppia derives
 * the SAC address from `{ code, issuer }` and rejects the entry when it does
 * not match the configured contract, so an unverified guess would take the
 * whole catalog down rather than merely skipping SDEX for that asset.
 *
 * Institutional and non-swappable assets are excluded here, keeping the
 * existing allowlist-gating: a quote for them can only fail at signing time.
 */
export function getSwapTokenCatalog(): Record<string, Asset> {
  const catalog: Record<string, Asset> = {};

  for (const [code, info] of Object.entries(getSwappableTokens())) {
    if (code === "XLM") {
      catalog[code] = { type: "native" };
      continue;
    }

    if (!info.contract) continue;

    catalog[code] = {
      type: "contract",
      contractId: info.contract,
      decimals: info.decimals,
      ...(info.issuer
        ? { classic: { code: info.code, issuer: info.issuer } }
        : {}),
    };
  }

  return catalog;
}
