import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { horizonUrl, networkPassphrase } from "@/lib/constants/network";

function reserveStroopsFromApiString(s: string): bigint {
  const t = s.trim();
  if (!t) return 0n;
  const dot = t.indexOf(".");
  const intPart = dot === -1 ? t : t.slice(0, dot);
  const digits = intPart.replace(/\D/g, "");
  if (!digits) return 0n;
  try {
    return BigInt(digits);
  } catch {
    return 0n;
  }
}

/** Second leg stroops for a proportional deposit (1% slippage buffer). */
export function aquaProportionalAmountB(
  amountA: bigint,
  reserves: string[]
): bigint {
  if (reserves.length < 2) return amountA;
  const reserveA = reserveStroopsFromApiString(reserves[0]);
  const reserveB = reserveStroopsFromApiString(reserves[1]);
  if (reserveA <= 0n || reserveB <= 0n) return amountA;
  return (amountA * reserveB * 101n) / (reserveA * 100n);
}

// --- Classic trustlines (Horizon) ---

interface ClassicAssetRef {
  code: string;
  issuer: string;
}

/**
 * Aqua API `tokens_str` entries: `"native"` or `"CODE:ISSUER"`.
 */
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

/**
 * Returns classic assets from the pool that this account does not trust yet
 * (Horizon is the source of truth for trustlines).
 */
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

export async function submitHorizonTransaction(signedXdr: string): Promise<void> {
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

/**
 * Single transaction with one changeTrust per missing asset.
 */
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
