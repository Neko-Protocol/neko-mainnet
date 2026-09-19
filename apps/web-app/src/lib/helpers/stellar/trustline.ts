import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { TokenMetadata } from "@blend-capital/blend-sdk";
import {
  allowHttpForSoroban,
  horizonUrl,
  networkPassphrase,
  rpcUrl,
} from "@/lib/constants/network";
import { extractSignedTxXdr, type SignTransactionFn } from "@neko/orchestrator";
import { getAvailableTokens } from "@/lib/helpers/stellar/swap-kit/tokens";
import type { Token } from "@/lib/types/swapTypes";
import {
  horizonNativeBalanceToStroops,
  ledgerMinBalanceStroops,
} from "./stellarAccountReserve";

export interface ClassicAssetRef {
  code: string;
  issuer: string;
}

function parseTokenStrForClassic(
  tokenStr: string
): "native" | ClassicAssetRef | null {
  const trimmed = tokenStr.trim();
  if (trimmed === "native") return "native";
  const colon = trimmed.indexOf(":");
  if (colon <= 0) return null;
  const code = trimmed.slice(0, colon);
  const issuer = trimmed.slice(colon + 1);
  if (!code || !issuer) return null;
  return { code, issuer };
}

export async function getMissingClassicTrustlines(
  publicKey: string,
  tokensStr: string[]
): Promise<ClassicAssetRef[]> {
  const server = new Horizon.Server(horizonUrl);
  const { balances } = await server.loadAccount(publicKey);
  const missing: ClassicAssetRef[] = [];

  for (const raw of tokensStr) {
    const parsed = parseTokenStrForClassic(raw);
    if (parsed === "native" || parsed === null) continue;

    const has = balances.some((b) => {
      if (b.asset_type === "native") return false;
      return (
        "asset_code" in b &&
        "asset_issuer" in b &&
        b.asset_code === parsed.code &&
        b.asset_issuer === parsed.issuer
      );
    });
    if (!has) missing.push(parsed);
  }

  return missing;
}

export async function submitHorizonTransaction(
  signedXdr: string
): Promise<void> {
  const res = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: signedXdr }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Horizon rejected transaction: ${body}`);
  }
}

export async function buildAddClassicTrustlinesTxXdr(
  publicKey: string,
  missing: ClassicAssetRef[]
): Promise<string> {
  if (missing.length === 0) {
    throw new Error("No missing trustlines to add");
  }

  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(publicKey);

  let builder = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  });

  for (const { code, issuer } of missing) {
    builder = builder.addOperation(
      Operation.changeTrust({
        asset: new Asset(code, issuer),
      })
    );
  }

  return builder.setTimeout(300).build().toXDR();
}

type HorizonAssetRecord = {
  asset_code?: string;
  asset_issuer?: string;
};

type HorizonAssetsResponse = {
  _embedded?: { records?: HorizonAssetRecord[] };
};

/**
 * Resolves the classic Stellar asset (code + issuer) for a SAC contract.
 *
 * Strategy 0: Use the Blend SDK's TokenMetadata  reads the contract instance
 *   data directly from Soroban RPC, returning the underlying Asset for SAC tokens.
 * Strategy 1: Direct Horizon lookup via `?contract_id=` (Horizon v2.29+).
 * Strategy 2: Fetch by asset code and verify by computing the SAC contract ID.
 *
 * Returns null if the contract cannot be resolved (e.g. native Soroban token).
 */
async function resolveClassicAssetForSAC(
  contractId: string,
  assetCode: string
): Promise<ClassicAssetRef | null> {
  // Strategy 0: Blend SDK TokenMetadata (most reliable  reads on-chain data)
  try {
    const network = {
      rpc: rpcUrl,
      passphrase: networkPassphrase,
      ...(allowHttpForSoroban ? { opts: { allowHttp: true } } : {}),
    };
    const meta = await TokenMetadata.load(network, contractId);
    if (meta.asset) {
      return { code: meta.asset.getCode(), issuer: meta.asset.getIssuer() };
    }
  } catch {
    // fall through to strategy 1
  }

  // Strategy 1: direct Horizon contract_id lookup
  try {
    const url = `${horizonUrl}/assets?contract_id=${encodeURIComponent(contractId)}&limit=1`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = (await resp.json()) as HorizonAssetsResponse;
      const record = data._embedded?.records?.[0];
      if (record?.asset_code && record?.asset_issuer) {
        return { code: record.asset_code, issuer: record.asset_issuer };
      }
    }
  } catch {
    // fall through to strategy 2
  }

  // Strategy 2: fetch by asset code and match by computed SAC contract ID
  try {
    const url = `${horizonUrl}/assets?asset_code=${encodeURIComponent(assetCode)}&limit=20`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = (await resp.json()) as HorizonAssetsResponse;
    const records = data._embedded?.records ?? [];

    for (const record of records) {
      if (!record.asset_code || !record.asset_issuer) continue;
      try {
        const sacId = new Asset(
          record.asset_code,
          record.asset_issuer
        ).contractId(networkPassphrase);
        if (sacId === contractId) {
          return { code: record.asset_code, issuer: record.asset_issuer };
        }
      } catch {
        // skip
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Ensures the user has a trustline for the classic Stellar asset underlying
 * the given SAC contract. If the trustline is missing, builds a `changeTrust`
 * transaction, signs it, and submits it to Horizon.
 *
 * Safe to call unconditionally  silently no-ops for XLM and for contracts
 * that cannot be resolved to a classic asset.
 */
export async function ensureTrustlineForSAC(
  contractId: string,
  assetCode: string,
  walletAddress: string,
  signTransaction: SignTransactionFn
): Promise<void> {
  if (!contractId || assetCode === "XLM") return;

  const classicAsset = await resolveClassicAssetForSAC(contractId, assetCode);
  if (!classicAsset) return;

  const missing = await getMissingClassicTrustlines(walletAddress, [
    `${classicAsset.code}:${classicAsset.issuer}`,
  ]);
  if (missing.length === 0) return;

  const xdr = await buildAddClassicTrustlinesTxXdr(walletAddress, missing);
  const signedTxXdr = extractSignedTxXdr(
    await signTransaction(xdr, { networkPassphrase })
  );
  await submitHorizonTransaction(signedTxXdr);
}

/** One trustline is one subentry, and each subentry locks a base reserve. */
const TRUSTLINE_RESERVE_STROOPS = 5_000_000n;

/**
 * The classic identity of a swap token, taken from the asset registry.
 *
 * Every swappable asset there carries a verified issuer, so this resolves
 * without a network round trip. XLM is native and pure Soroban tokens hold
 * balances in contract storage, so neither can be trusted and both return
 * null.
 */
export function resolveClassicAssetForSwapToken(
  token: Token | string
): ClassicAssetRef | null {
  const tokens = getAvailableTokens();
  const code = typeof token === "string" ? token : token.code;
  const contract = typeof token === "string" ? token : token.contract;

  const config =
    (code ? tokens[code.toUpperCase()] : undefined) ??
    Object.values(tokens).find((info) => info.contract === contract);

  if (!config?.issuer || config.code === "XLM") return null;
  return { code: config.code, issuer: config.issuer };
}

export interface EnsureSwapTrustlineParams {
  token: Token | string;
  walletAddress: string;
  signTransaction: SignTransactionFn;
  /** Called only when a trustline is actually needed, before the wallet prompt. */
  onTrustlineNeeded?: (asset: ClassicAssetRef) => void;
  /** Raised when the account cannot cover another subentry's reserve. */
  insufficientReserveMessage: (code: string) => string;
}

/**
 * Adds the trustline a swap's output asset needs, if it is missing.
 *
 * The swap cannot carry this itself: the router refuses to build a swap into
 * an asset the account does not trust, and the route it would have built is
 * sealed and opaque, so there is no envelope to prepend an operation to. The
 * trustline settles in its own transaction first, and the swap is quoted
 * fresh afterwards against an account that can now receive the asset.
 *
 * Returns true when a trustline was created, false when none was needed.
 */
export async function ensureTrustlineForSwapToken({
  token,
  walletAddress,
  signTransaction,
  onTrustlineNeeded,
  insufficientReserveMessage,
}: EnsureSwapTrustlineParams): Promise<boolean> {
  const asset = resolveClassicAssetForSwapToken(token);
  if (!asset) return false;

  const missing = await getMissingClassicTrustlines(walletAddress, [
    `${asset.code}:${asset.issuer}`,
  ]);
  if (missing.length === 0) return false;

  // Checked before the wallet prompt: a reserve shortfall would otherwise
  // reach the user as Horizon's raw `op_low_reserve`, after they had signed.
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(walletAddress);
  const native = account.balances.find(
    (balance) => balance.asset_type === "native"
  );
  const available =
    horizonNativeBalanceToStroops(native?.balance ?? "0") -
    ledgerMinBalanceStroops(account.subentry_count);
  if (available < TRUSTLINE_RESERVE_STROOPS) {
    throw new Error(insufficientReserveMessage(asset.code));
  }

  onTrustlineNeeded?.(asset);

  const xdr = await buildAddClassicTrustlinesTxXdr(walletAddress, missing);
  const signedTxXdr = extractSignedTxXdr(
    await signTransaction(xdr, { networkPassphrase })
  );
  // Horizon's submit endpoint returns once the transaction is in a ledger, so
  // the trustline is live by the time this resolves and the swap can quote.
  await submitHorizonTransaction(signedTxXdr);
  return true;
}
