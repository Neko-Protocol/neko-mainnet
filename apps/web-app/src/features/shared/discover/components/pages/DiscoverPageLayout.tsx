"use client";

import React, { useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAvailableTokens } from "@/lib/helpers/stellar/swap-kit";
import { PageContainer } from "@/components/ui/PageContainer";
import { BannerPage } from "@/components/ui/BannerPage";
import { ASSET_CLASS_FILTERS, getAssetTaxonomy } from "../../utils/assetClass";
import { ASSET_INFO } from "../../utils/assetInfo";
import type { AssetClass } from "../../types/discover";

type ClassFilter = AssetClass | "all";

interface DiscoverPageLayoutProps {
  renderCard: (tokenCode: string) => ReactNode;
}

export function DiscoverPageLayout({ renderCard }: DiscoverPageLayoutProps) {
  const t = useTranslations("sharedDiscover.page");
  const tFilters = useTranslations("sharedDiscover.classFilters");
  const tokenCodes = useMemo(
    () => Object.keys(getAvailableTokens()).map((c) => c.toUpperCase()),
    []
  );

  const [activeFilter, setActiveFilter] = useState<ClassFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<ClassFilter, number> = {
      all: tokenCodes.length,
      native: 0,
      stablecoin: 0,
      "sovereign-bond": 0,
      "tokenized-fund": 0,
      "structured-credit": 0,
      commodity: 0,
    };
    for (const code of tokenCodes) {
      const cls = getAssetTaxonomy(code)?.class;
      if (cls) c[cls] += 1;
    }
    return c;
  }, [tokenCodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokenCodes.filter((code) => {
      const taxonomy = getAssetTaxonomy(code);
      if (activeFilter !== "all" && taxonomy?.class !== activeFilter) {
        return false;
      }
      if (!q) return true;
      const name = ASSET_INFO[code]?.name ?? "";
      return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [tokenCodes, activeFilter, query]);

  return (
    <PageContainer maxWidth="7xl">
      <BannerPage
        title={t("title")}
        subtitle={t("subtitle")}
        badge={t("badge")}
        imageSrc="/banners/discover.png"
        imageAlt={t("illustrationAlt")}
        imageSize="large"
        imageLayoutClassName="-right-[116px] top-2 h-[115%] w-[118%] opacity-60 sm:-right-116 sm:-top-15 sm:h-[155%] sm:w-[120%] sm:opacity-100"
        className="mb-8"
      />

      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label={t("assetClassAriaLabel")}
          className="flex flex-wrap gap-2"
        >
          {ASSET_CLASS_FILTERS.map((f) => {
            const active = activeFilter === f.id;
            const count = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(f.id)}
                title={tFilters(f.descriptionKey)}
                className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-white text-[#121212] border-white"
                    : "bg-[#1C1C1C] text-white/60 border-white/5 hover:text-white hover:border-white/15"
                }`}
              >
                {tFilters(f.labelKey)}
                <span
                  className={`tabular-nums px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    active
                      ? "bg-black/10 text-[#121212]/70"
                      : "bg-white/5 text-white/40 group-hover:bg-white/10"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-[#1C1C1C] border border-white/5 rounded-full pl-9 pr-9 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((code) => (
            <React.Fragment key={code}>{renderCard(code)}</React.Fragment>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-12 text-center">
          <p className="text-white/40 text-base">
            {tokenCodes.length === 0
              ? t("noAssetsConfigured")
              : t("noAssetsMatchFilters")}
          </p>
          {tokenCodes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setQuery("");
              }}
              className="mt-3 text-xs font-semibold text-[#229EDF] hover:underline"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      )}
    </PageContainer>
  );
}
