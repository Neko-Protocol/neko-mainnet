import { NextResponse } from "next/server";

const LOG_PREFIX = "[etherfuse/bond-yields]";

function debugLog(...args: unknown[]) {
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.ETHERFUSE_DEBUG === "1";
  if (!enabled) return;
  console.log(LOG_PREFIX, ...args);
}

interface EtherfuseYieldEntry {
  symbol: string;
  apy: number;
  currency: string;
  lastUpdated: string;
  isFallback?: boolean;
}

const TARGET_SYMBOLS = ["CETES", "USTRY", "TESOURO"] as const;

type TargetSymbol = (typeof TARGET_SYMBOLS)[number];

const FALLBACK_YIELDS: Record<TargetSymbol, number> = {
  CETES: 9.5,
  USTRY: 4.8,
  TESOURO: 13.5,
};

const FALLBACK_CURRENCY: Record<TargetSymbol, string> = {
  CETES: "MXN",
  USTRY: "USD",
  TESOURO: "BRL",
};

interface BondCostRow {
  bond_symbol?: string;
  currency?: string;
  current_time?: string;
  current_basis_points?: number;
}

function parseTimeMs(t: string | undefined): number {
  if (!t) return 0;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : 0;
}

function dedupeBestRow(rows: BondCostRow[]): BondCostRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => {
    const bestT = parseTimeMs(best.current_time);
    const rowT = parseTimeMs(row.current_time);
    if (rowT > bestT) return row;
    if (rowT < bestT) return best;
    const bestBps = best.current_basis_points ?? 0;
    const rowBps = row.current_basis_points ?? 0;
    return rowBps > bestBps ? row : best;
  });
}

function fallbackEntry(symbol: TargetSymbol): EtherfuseYieldEntry {
  return {
    symbol,
    apy: FALLBACK_YIELDS[symbol],
    currency: FALLBACK_CURRENCY[symbol],
    lastUpdated: new Date().toISOString(),
    isFallback: true,
  };
}

function buildFromApi(
  rowsBySymbol: Partial<Record<TargetSymbol, BondCostRow>>
): EtherfuseYieldEntry[] {
  return TARGET_SYMBOLS.map((symbol) => {
    const row = rowsBySymbol[symbol];
    const bps = row?.current_basis_points;
    const currency = row?.currency?.trim();
    const lastUpdated = row?.current_time?.trim();

    if (
      row &&
      typeof bps === "number" &&
      Number.isFinite(bps) &&
      bps >= 0 &&
      currency &&
      lastUpdated
    ) {
      return {
        symbol,
        apy: bps / 100,
        currency,
        lastUpdated,
        isFallback: false,
      };
    }

    return fallbackEntry(symbol);
  });
}

export async function GET() {
  const cacheHeaders = {
    "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
  };

  try {
    const res = await fetch("https://api.etherfuse.com/lookup/bonds/cost", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      debugLog("Etherfuse HTTP error  using fallbacks", {
        status: res.status,
        statusText: res.statusText,
      });
      const entries = TARGET_SYMBOLS.map(fallbackEntry);
      return NextResponse.json(entries, { headers: cacheHeaders });
    }

    const rawBody = await res.json();
    debugLog("Etherfuse raw JSON (typeof)", typeof rawBody, {
      isArray: Array.isArray(rawBody),
      keysOrLength: Array.isArray(rawBody)
        ? rawBody.length
        : rawBody && typeof rawBody === "object"
          ? Object.keys(rawBody as object).length
          : null,
    });
    debugLog("Etherfuse raw snapshot", JSON.stringify(rawBody).slice(0, 2500));

    const data = rawBody as Record<string, BondCostRow>;
    if (!data || typeof data !== "object") {
      debugLog("Parsed body invalid  using fallbacks");
      const entries = TARGET_SYMBOLS.map(fallbackEntry);
      return NextResponse.json(entries, { headers: cacheHeaders });
    }

    const grouped: Partial<Record<TargetSymbol, BondCostRow[]>> = {};

    for (const row of Object.values(data)) {
      const sym = row?.bond_symbol?.toUpperCase();
      if (!sym || !TARGET_SYMBOLS.includes(sym as TargetSymbol)) continue;
      const key = sym as TargetSymbol;
      if (!grouped[key]) grouped[key] = [];
      grouped[key]!.push(row);
    }

    const rowsBySymbol: Partial<Record<TargetSymbol, BondCostRow>> = {};
    for (const sym of TARGET_SYMBOLS) {
      const pick = dedupeBestRow(grouped[sym] ?? []);
      if (pick) rowsBySymbol[sym] = pick;
    }

    debugLog("Grouped row counts by symbol", {
      CETES: grouped.CETES?.length ?? 0,
      USTRY: grouped.USTRY?.length ?? 0,
      TESOURO: grouped.TESOURO?.length ?? 0,
    });

    debugLog(
      "Picked rows → basis_points & computed APY (bps/100)",
      TARGET_SYMBOLS.reduce(
        (acc, sym) => {
          const row = rowsBySymbol[sym];
          const bps = row?.current_basis_points;
          acc[sym] = {
            current_basis_points: bps,
            apyFromBps:
              typeof bps === "number" && Number.isFinite(bps)
                ? bps / 100
                : null,
            currency: row?.currency,
            current_time: row?.current_time,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            current_basis_points: number | undefined;
            apyFromBps: number | null;
            currency: string | undefined;
            current_time: string | undefined;
          }
        >
      )
    );

    const entries = buildFromApi(rowsBySymbol);
    debugLog(
      "Response entries sent to client (apy, isFallback)",
      entries.map((e) => ({
        symbol: e.symbol,
        apy: e.apy,
        currency: e.currency,
        isFallback: e.isFallback,
        lastUpdated: e.lastUpdated,
      }))
    );
    return NextResponse.json(entries, { headers: cacheHeaders });
  } catch (err) {
    debugLog("Fetch or parse threw  using fallbacks", err);
    const entries = TARGET_SYMBOLS.map(fallbackEntry);
    return NextResponse.json(entries, { headers: cacheHeaders });
  }
}
