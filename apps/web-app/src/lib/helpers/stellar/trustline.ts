import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { TokenMetadata } from "@blend-capital/blend-sdk";
import { horizonUrl, networkPassphrase, rpcUrl } from "@/lib/constants/network";

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

const TRUST_LIMIT_MAX = "9223372036854775807";

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
        limit: TRUST_LIMIT_MAX,
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
    const network = { rpc: rpcUrl, passphrase: networkPassphrase };
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
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<{ signedTxXdr: string }>
): Promise<void> {
  if (!contractId || assetCode === "XLM") return;

  const classicAsset = await resolveClassicAssetForSAC(contractId, assetCode);
  if (!classicAsset) return;

  const missing = await getMissingClassicTrustlines(walletAddress, [
    `${classicAsset.code}:${classicAsset.issuer}`,
  ]);
  if (missing.length === 0) return;

  const xdr = await buildAddClassicTrustlinesTxXdr(walletAddress, missing);
  const { signedTxXdr } = await signTransaction(xdr, { networkPassphrase });
  await submitHorizonTransaction(signedTxXdr);
}
