"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowLeftRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { ASSET_INFO } from "../../utils/stockInfo";
import type { AssetInfo } from "../../types/discover";
import { PageContainer } from "@/components/ui/PageContainer";
import { ROUTES } from "../../constants/discover";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  CLASS_ACCENT,
  CLASS_EXPLANATIONS,
  getAssetTaxonomy,
} from "../../utils/assetClass";
import type { PriceSource } from "@/lib/services/stellar-price.service";

const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  reflector: "Reflector oracle",
  soroswap: "Soroswap",
  coingecko: "CoinGecko",
};

function priceSourceLabel(source: PriceSource | null): string | null {
  return source ? PRICE_SOURCE_LABEL[source] : null;
}

type InfoTab = "overview" | "details" | "buy";

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors group"
    >
      <span className="font-mono text-xs">{short}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 group-hover:text-white/60" />
      )}
    </button>
  );
}

function AttributeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">
        {children}
      </span>
    </div>
  );
}

const AssetDetail: React.FC = () => {
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

  // Tabs scroll-spy (mirrors PoolDetail UX)
  const [activeTab, setActiveTab] = useState<InfoTab>("overview");
  const overviewRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const buyRef = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<InfoTab, React.RefObject<HTMLDivElement | null>> = {
    overview: overviewRef,
    details: detailsRef,
    buy: buyRef,
  };

  useEffect(() => {
    const orderedTabs: InfoTab[] = ["overview", "details", "buy"];
    const anchorOffset = 140;

    const updateActiveTab = () => {
      const available = orderedTabs.filter((id) => sectionRefs[id].current);
      if (available.length === 0) return;

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
    sectionRefs[id].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (!symbol) {
      void router.push(ROUTES.DISCOVER_BASE);
    }
  }, [symbol, router]);

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

  const formattedPrice =
    Number.isFinite(price) && price > 0
      ? formatCurrency(convertUsdToSelected(price, fxRate), selectedCurrency)
      : null;

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    ...(stockInfo.buyInfo
      ? [{ id: "buy" as InfoTab, label: "Where to buy" }]
      : []),
  ];

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
          <div className="min-w-0 p-8 lg:border-r border-white/7 order-2 lg:order-1">
            {/* Header */}
            <div className="flex items-start gap-4 mb-10">
              <div className="relative w-16 h-16 rounded-full bg-white ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                <Image
                  src={stockInfo.logo || "/assets/xlm-logo.png"}
                  alt={stockInfo.name}
                  fill
                  unoptimized
                  className="object-cover scale-110"
                />
              </div>
              <div className="min-w-0 flex-1 h-16 flex flex-col justify-between">
                <div className="min-h-0 flex items-center gap-2">
                  <h1 className="text-white font-bold text-2xl leading-none truncate">
                    {symbolUpper}
                  </h1>
                  {taxonomy && accent && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${accent.chip}`}
                    >
                      {taxonomy.classLabel}
                    </span>
                  )}
                </div>
                <div className="min-h-0 flex items-center gap-3">
                  <span className="text-white/70 text-sm font-medium truncate">
                    {stockInfo.name}
                  </span>
                  <span className="shrink-0">
                    <CopyAddress address={cfg!.contract} />
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 mb-8" />

            {/* Metrics grid */}
            <div className="flex flex-wrap justify-between gap-y-7">
              <div>
                <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                  Spot Price ({selectedCurrency})
                </p>
                {isLoadingPrice ? (
                  <LoadingSpinner variant="spinner" size="md" />
                ) : (
                  <p
                    className={`text-3xl font-bold tabular-nums leading-none ${
                      formattedPrice ? "text-white" : "text-white/40"
                    }`}
                  >
                    {formattedPrice ?? "No data"}
                  </p>
                )}
                <p className="text-white/30 text-xs mt-2">
                  {priceSourceLabel(priceSource)
                    ? `via ${priceSourceLabel(priceSource)}`
                    : "Source unavailable"}
                </p>
              </div>

              {taxonomy?.peg && (
                <div>
                  <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                    Pegged To
                  </p>
                  <p className="text-white text-3xl font-bold tabular-nums leading-none">
                    {taxonomy.peg}
                  </p>
                </div>
              )}

              {taxonomy?.issuer && (
                <div>
                  <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                    Issuer
                  </p>
                  <p className="text-white text-lg font-bold leading-tight max-w-[14rem]">
                    {taxonomy.issuer}
                  </p>
                </div>
              )}

              {taxonomy?.region && taxonomy.class !== "sovereign-bond" && (
                <div>
                  <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                    Region
                  </p>
                  <p className="text-white text-3xl font-bold tabular-nums leading-none">
                    {taxonomy.region}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 mt-10" />

            {/* Tabs */}
            <div className="mt-8">
              <div
                className="sticky top-0 z-10 -mx-8 px-8 border-b border-white/5"
                style={{ background: "#111111" }}
              >
                <div className="flex gap-6">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => scrollTo(t.id)}
                      className={`pb-3 text-sm font-medium transition-colors relative ${
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
                <h2 className="text-white text-xl font-bold mb-4">Overview</h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  {stockInfo.summary ?? stockInfo.description}
                </p>

                {stockInfo.highlights && stockInfo.highlights.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-white/50 text-sm font-medium mb-3 uppercase tracking-wider">
                      Highlights
                    </h3>
                    <ul className="space-y-2">
                      {stockInfo.highlights.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-white/80 text-sm leading-relaxed"
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
                    <h3 className="text-white text-sm font-semibold mb-2">
                      {classExplanation.title}
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {classExplanation.body}
                    </p>
                  </div>
                )}
              </div>

              <div ref={detailsRef} className="mt-12 scroll-mt-16">
                <h2 className="text-white text-xl font-bold mb-4">Details</h2>
                <h3 className="text-white/50 text-sm font-medium mb-2">
                  Asset Attributes
                </h3>
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

              {stockInfo.buyInfo && (
                <div ref={buyRef} className="mt-12 scroll-mt-16 pb-12">
                  <h2 className="text-white text-xl font-bold mb-4">
                    Where to buy
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed mb-5 max-w-2xl">
                    {stockInfo.buyInfo.description}
                  </p>
                  <a
                    href={stockInfo.buyInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#229EDF" }}
                  >
                    Open {stockInfo.buyInfo.platform}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── Right sticky panel ── */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start h-auto">
            <div className="p-6 flex flex-col gap-3 rounded-2xl lg:rounded-none">
              <div className="rounded-xl bg-[#1C1C1C] border border-white/5 p-5">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
                  Current price
                </p>
                {isLoadingPrice ? (
                  <LoadingSpinner variant="spinner" size="md" />
                ) : (
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      formattedPrice ? "text-white" : "text-white/40"
                    }`}
                  >
                    {formattedPrice ?? "No data"}
                  </p>
                )}
                <p className="text-white/30 text-[10px] mt-1">
                  Quoted in {selectedCurrency}
                  {priceSourceLabel(priceSource)
                    ? ` via ${priceSourceLabel(priceSource)}`
                    : ""}
                </p>
              </div>

              <Link
                href={`/swap?to=${symbolUpper}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap on Neko
              </Link>

              {stockInfo.buyInfo && (
                <a
                  href={stockInfo.buyInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/5"
                >
                  Buy on {stockInfo.buyInfo.platform}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;
