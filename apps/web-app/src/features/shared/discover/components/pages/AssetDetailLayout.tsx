"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ASSET_INFO } from "../../utils/assetInfo";
import type { AssetInfo } from "../../types/discover";
import { PageContainer } from "@/components/ui/PageContainer";
import { ROUTES } from "../../constants/discover";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAssetPriceHistory } from "../../hooks/useAssetPriceHistory";
import {
  CLASS_ACCENT,
  CLASS_EXPLANATIONS,
  getAssetTaxonomy,
} from "../../utils/assetClass";
import type { PriceSource } from "@/lib/services/stellar-price.service";
import { AttributeRow, CopyAddress, useIsMaxSm } from "../ui/AssetDetailAtoms";

const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  reflector: "Reflector",
  soroswap: "Soroswap",
  coingecko: "CoinGecko",
};

function priceSourceLabel(source: PriceSource | null): string | null {
  return source ? PRICE_SOURCE_LABEL[source] : null;
}

type InfoTab = "overview" | "details";

export interface AssetDetailContext {
  symbolUpper: string;
  stockInfo: AssetInfo;
}

export interface AssetDetailLayoutProps {
  /** Content rendered in the right sticky panel. */
  renderRightPanel: (ctx: AssetDetailContext) => ReactNode;
  /** When true, the right panel is always visible (block). Otherwise hidden on mobile (hidden lg:block). */
  rightPanelAlwaysVisible?: boolean;
  /** Optional mobile-only action buttons rendered between the chart and the tabs. */
  renderMobileActions?: (ctx: AssetDetailContext) => ReactNode;
}

export function AssetDetailLayout({
  renderRightPanel,
  rightPanelAlwaysVisible = false,
  renderMobileActions,
}: AssetDetailLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const symbol = params?.symbol as string | undefined;

  const symbolUpper = typeof symbol === "string" ? symbol.toUpperCase() : "";
  const assets = getAssetsConfig();
  const cfg = symbolUpper ? assets[symbolUpper] : undefined;
  const hasAsset = Boolean(cfg);

  const {
    price,
    source: priceSource,
    isLoading: isLoadingPrice,
  } = useTokenPrice(symbolUpper || undefined);
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const stockInfo = useMemo((): AssetInfo | undefined => {
    const fromStatic = ASSET_INFO[symbolUpper];
    if (fromStatic) return fromStatic;
    if (cfg) {
      return {
        logo: cfg.icon,
        name: cfg.name,
        description: cfg.name,
        summary: "",
      };
    }
    return undefined;
  }, [symbolUpper, cfg]);

  const taxonomy = stockInfo?.taxonomy ?? getAssetTaxonomy(symbolUpper);
  const accent = taxonomy ? CLASS_ACCENT[taxonomy.class] : undefined;
  const classExplanation = taxonomy
    ? CLASS_EXPLANATIONS[taxonomy.class]
    : undefined;

  const [activeTab, setActiveTab] = useState<InfoTab>("overview");
  const overviewRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<InfoTab, React.RefObject<HTMLDivElement | null>> = {
    overview: overviewRef,
    details: detailsRef,
  };

  useEffect(() => {
    const orderedTabs: InfoTab[] = ["overview", "details"];
    const anchorOffset = 140;

    const updateActiveTab = () => {
      const available = orderedTabs.filter((id) => sectionRefs[id].current);
      if (available.length === 0) return;

      const isAtBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (isAtBottom) {
        setActiveTab(available[available.length - 1]);
        return;
      }

      let current = available[0];
      for (const id of available) {
        const top = sectionRefs[id].current!.getBoundingClientRect().top;
        if (top - anchorOffset <= 0) {
          current = id;
        }
      }
      setActiveTab(current);
    };

    updateActiveTab();
    window.addEventListener("scroll", updateActiveTab, { passive: true });
    window.addEventListener("resize", updateActiveTab);
    return () => {
      window.removeEventListener("scroll", updateActiveTab);
      window.removeEventListener("resize", updateActiveTab);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTo = (id: InfoTab) => {
    setActiveTab(id);
    const target = sectionRefs[id].current;
    if (!target) return;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 96,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!symbol) {
      void router.push(ROUTES.DISCOVER_BASE);
    }
  }, [symbol, router]);

  const formattedPrice =
    Number.isFinite(price) && price > 0
      ? formatCurrency(convertUsdToSelected(price, fxRate), selectedCurrency)
      : null;

  const { data: priceHistory, isLoading: isLoadingHistory } =
    useAssetPriceHistory(symbolUpper || undefined);

  const chartData = useMemo(
    () =>
      (priceHistory ?? []).map((point) => ({
        date: point.date,
        value: convertUsdToSelected(point.price, fxRate),
      })),
    [priceHistory, fxRate]
  );

  const isMaxSm = useIsMaxSm();

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
  ];

  if (!symbol) return null;

  if (!hasAsset || !stockInfo) {
    return (
      <PageContainer maxWidth="5xl">
        <Link
          href={ROUTES.DISCOVER_BASE}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
          <p className="text-white/40 text-lg">Asset not found</p>
        </div>
      </PageContainer>
    );
  }

  const ctx: AssetDetailContext = { symbolUpper, stockInfo };

  return (
    <div className="w-full min-w-0 max-w-full min-h-screen overflow-x-hidden flex flex-col px-4 sm:px-6 lg:px-8">
      <div className="py-4 shrink-0">
        <Link
          href={ROUTES.DISCOVER_BASE}
          className="inline-flex items-center gap-1 text-white/60 hover:text-white font-medium text-sm transition-colors"
        >
          &larr; Back to Discover
        </Link>
      </div>

      <div className="flex-1 pb-4">
        <div
          className="w-full h-full min-h-[calc(100vh-10rem)] rounded-2xl border border-white/7 grid grid-cols-1 lg:grid-cols-[1fr_22rem] items-start"
          style={{ background: "#111111" }}
        >
          {/* ── Left column ── */}
          <div className="min-w-0 p-8 max-sm:p-4 lg:border-r border-white/7 order-2 lg:order-1">
            {/* Header */}
            <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between max-sm:items-center">
              <div className="flex min-w-0 items-start gap-5 max-sm:flex-col max-sm:items-center">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/10">
                  <Image
                    src={stockInfo.logo || "/assets/xlm-logo.png"}
                    alt={stockInfo.name}
                    fill
                    unoptimized
                    className="object-cover scale-110"
                  />
                </div>
                <div className="flex h-20 min-w-0 flex-1 flex-col justify-between max-sm:h-auto max-sm:w-full max-sm:flex-none max-sm:items-center max-sm:justify-start max-sm:gap-2">
                  <div className="min-h-0 flex items-center gap-3 max-sm:flex-wrap max-sm:justify-center max-sm:gap-x-2 max-sm:gap-y-1">
                    <h1 className="pool-detail-hero-title truncate max-sm:overflow-visible max-sm:whitespace-normal max-sm:text-center">
                      {symbolUpper}
                    </h1>
                    {taxonomy && accent && (
                      <span
                        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium text-white/70 ${accent.bg}`}
                      >
                        {taxonomy.classLabel}
                      </span>
                    )}
                  </div>
                  <div className="min-h-0 flex items-center gap-3 max-sm:flex-col max-sm:items-center max-sm:gap-2">
                    <span className="truncate text-base font-medium leading-snug text-white/70 max-sm:max-w-full max-sm:overflow-visible max-sm:whitespace-normal max-sm:text-center">
                      {stockInfo.name}
                    </span>
                    <span className="shrink-0 max-sm:flex max-sm:justify-center">
                      <CopyAddress address={cfg!.contract} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 sm:text-right max-sm:w-full max-sm:text-center">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                  Spot Price ({selectedCurrency})
                </p>
                {isLoadingPrice ? (
                  <div className="flex sm:justify-end max-sm:justify-center">
                    <LoadingSpinner variant="spinner" size="md" />
                  </div>
                ) : (
                  <p
                    className={`pool-detail-metric-value ${
                      formattedPrice ? "text-white" : "text-white/40"
                    }`}
                  >
                    {formattedPrice ?? "No data"}
                  </p>
                )}
                <p className="mt-2 text-xs text-white/30">
                  {priceSourceLabel(priceSource)
                    ? `via ${priceSourceLabel(priceSource)}`
                    : "Source unavailable"}
                </p>
              </div>
            </div>

            <div className="border-t border-white/5" />

            <section className="mt-8 rounded-2xl border border-white/7 bg-[#0E0E0E] p-5 max-sm:p-4">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold leading-tight text-white">
                  Price (last 7 days)
                </h2>
                {chartData.length > 0 && (
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live
                  </div>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="h-[220px] flex items-center justify-center">
                  <LoadingSpinner variant="spinner" size="md" />
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      />
                      <YAxis
                        width={isMaxSm ? 64 : 90}
                        tick={{
                          fill: "rgba(255,255,255,0.55)",
                          fontSize: isMaxSm ? 11 : 12,
                        }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                        tickFormatter={(v) =>
                          formatCurrency(Number(v), selectedCurrency)
                        }
                      />
                      <Tooltip
                        formatter={(v) =>
                          formatCurrency(Number(v), selectedCurrency)
                        }
                        contentStyle={{
                          background: "#111111",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          color: "white",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center">
                  <p className="text-sm leading-relaxed text-white/45">
                    Not enough data yet
                  </p>
                </div>
              )}
            </section>

            {renderMobileActions && (
              <div className="mt-4 lg:hidden">{renderMobileActions(ctx)}</div>
            )}

            {/* Tabs */}
            <div className="mt-8">
              <div
                className="sticky top-0 z-10 -mx-8 border-b border-white/5 px-8 max-sm:-mx-4 max-sm:px-4"
                style={{ background: "#111111" }}
              >
                <div className="flex gap-6">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => scrollTo(t.id)}
                      className={`relative pb-3 text-sm font-medium leading-tight transition-colors ${
                        activeTab === t.id
                          ? "text-white"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {t.label}
                      {activeTab === t.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={overviewRef} className="mt-10 scroll-mt-16">
                <h2 className="mb-6 text-xl font-bold text-white">Overview</h2>
                <p className="text-sm leading-relaxed text-white/70">
                  {stockInfo.summary ?? stockInfo.description}
                </p>

                {stockInfo.highlights && stockInfo.highlights.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">
                      Highlights
                    </h3>
                    <ul className="space-y-2">
                      {stockInfo.highlights.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-sm leading-relaxed text-white/80"
                        >
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                              accent ? accent.bg : "bg-white/30"
                            }`}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {classExplanation && (
                  <div
                    className={`mt-6 rounded-xl border border-white/5 p-5 ${
                      accent ? accent.bg : "bg-white/5"
                    }`}
                  >
                    <h3 className="mb-2 text-sm font-semibold leading-tight text-white">
                      {classExplanation.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70">
                      {classExplanation.body}
                    </p>
                  </div>
                )}
              </div>

              <div ref={detailsRef} className="mt-12 scroll-mt-16">
                <h2 className="mb-6 text-xl font-bold text-white">Details</h2>
                <div>
                  <AttributeRow label="Symbol">{symbolUpper}</AttributeRow>
                  <AttributeRow label="Name">{stockInfo.name}</AttributeRow>
                  {taxonomy && (
                    <AttributeRow label="Class">
                      {taxonomy.classLabel}
                    </AttributeRow>
                  )}
                  {taxonomy?.peg && (
                    <AttributeRow label="Peg">{taxonomy.peg}</AttributeRow>
                  )}
                  {taxonomy?.region && (
                    <AttributeRow label="Region">
                      <span className="inline-flex items-center gap-1.5">
                        {taxonomy.region}
                      </span>
                    </AttributeRow>
                  )}
                  {taxonomy?.issuer && (
                    <AttributeRow label="Issuer">
                      {taxonomy.issuer}
                    </AttributeRow>
                  )}
                  <AttributeRow label="Yield bearing">
                    {taxonomy?.yieldBearing ? "Yes" : "No"}
                  </AttributeRow>
                  <AttributeRow label="Price source">
                    {priceSourceLabel(priceSource) ?? "Unavailable"}
                  </AttributeRow>
                  <AttributeRow label="Contract">
                    <CopyAddress address={cfg!.contract} />
                  </AttributeRow>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sticky panel ── */}
          <div
            className={`${rightPanelAlwaysVisible ? "block" : "hidden lg:block"} order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start h-auto`}
          >
            {renderRightPanel(ctx)}
          </div>
        </div>
      </div>
    </div>
  );
}
