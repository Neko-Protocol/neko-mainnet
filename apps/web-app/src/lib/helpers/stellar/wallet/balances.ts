import { Horizon } from "@stellar/stellar-sdk";
import { stellarNetwork, horizonUrl } from "@/lib/constants/network";
import { getAvailableTokens } from "@/lib/helpers/stellar/soroswap/tokens";
import { getBatchedTokenBalances } from "@/lib/helpers/stellar/sorobanBalance";
import { formatAmount, parseBalance } from "@/lib/helpers/formatUtils";
import { horizonNativeBalanceToStroops } from "@/lib/helpers/stellar/stellarAccountReserve";

const getHorizon = (): Horizon.Server | null => {
  if (typeof window === "undefined") return null;
  if (!horizonUrl) return null;
  try {
    return new Horizon.Server(horizonUrl, {
      allowHttp: stellarNetwork === "LOCAL",
    });
  } catch {
    return null;
  }
};

type HorizonBalance = Horizon.HorizonApi.BalanceLine & { balance: string };

export interface SorobanBalanceEntry {
  asset_type: "credit_alphanum4";
  asset_code: string;
  asset_issuer: string;
  balance: string;
}

export type MappedBalances = Record<
  string,
  HorizonBalance | SorobanBalanceEntry
>;

export type FetchBalancesResult = {
  balances: MappedBalances;
  subentryCount: number;
  nativeBalanceStroops: bigint;
};

export const fetchBalances = async (
  address: string
): Promise<FetchBalancesResult> => {
  if (typeof window === "undefined") {
    return { balances: {}, subentryCount: 0, nativeBalanceStroops: 0n };
  }
  const horizonInstance = getHorizon();
  if (!horizonInstance) {
    return { balances: {}, subentryCount: 0, nativeBalanceStroops: 0n };
  }
  const mapped: MappedBalances = {};
  let subentryCount = 0;
  let nativeBalanceStroops = 0n;
  let horizonBalanceLines: Horizon.HorizonApi.BalanceLine[] = [];
  // Account sequence reused for all Soroban simulate calls (no extra Horizon round-trips)
  let accountSequence = "0";

  try {
    // loadAccount gives us balances + sequence in one request
    const accountData = await horizonInstance.loadAccount(address);
    horizonBalanceLines = accountData.balances;
    subentryCount = accountData.subentry_count ?? 0;
    accountSequence = accountData.sequence;
    for (const b of accountData.balances) {
      if (b.asset_type === "native") {
        nativeBalanceStroops = horizonNativeBalanceToStroops(b.balance);
      }
      const formattedBalance = formatAmount(Number(b.balance));
      const balanceEntry = { ...b, balance: formattedBalance };
      const key =
        b.asset_type === "native"
          ? "xlm"
          : b.asset_type === "liquidity_pool_shares"
            ? b.liquidity_pool_id
            : `${b.asset_code}:${b.asset_issuer}`;
      mapped[key] = balanceEntry;
    }
  } catch (err) {
    console.warn("Horizon balance fetch failed, continuing with Soroban:", err);
    nativeBalanceStroops = 0n;
  }

  const classicAssetCodesWithNonZero = new Set<string>();
  for (const b of horizonBalanceLines) {
    if (b.asset_type === "native" || b.asset_type === "liquidity_pool_shares")
      continue;
    if (
      (b.asset_type === "credit_alphanum4" ||
        b.asset_type === "credit_alphanum12") &&
      "asset_code" in b &&
      Number(b.balance) > 0
    ) {
      classicAssetCodesWithNonZero.add(b.asset_code);
    }
  }

  try {
    const availableTokens = getAvailableTokens();
    const tokens = Object.entries(availableTokens)
      .filter(([code]) => code !== "XLM")
      .map(([code, info]) => ({
        code,
        contract: info.contract ?? "",
        decimals: info.decimals ?? 7,
      }));

    // Single batch call — reuses the already-loaded account sequence
    const sorobanBalances = await getBatchedTokenBalances(
      tokens,
      address,
      accountSequence
    );

    for (const [code, balance] of Object.entries(sorobanBalances)) {
      if (
        parseBalance(balance) > 0 &&
        !classicAssetCodesWithNonZero.has(code)
      ) {
        mapped[`soroban:${code}`] = {
          asset_type: "credit_alphanum4",
          asset_code: code,
          asset_issuer: "soroban",
          balance: formatAmount(parseBalance(balance)),
        };
      }
    }
  } catch (err) {
    console.warn("Soroban balance fetch failed:", err);
  }

  return { balances: mapped, subentryCount, nativeBalanceStroops };
};
