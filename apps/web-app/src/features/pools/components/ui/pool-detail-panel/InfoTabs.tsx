"use client";

import { useEffect, useRef, useState } from "react";
import type { PoolDetailPanelPool } from "./types";
import { ActivityFeed } from "./ActivityFeed";
import { MarketAttributeRow } from "./MarketAttributeRow";
import { OverviewTokenLabel } from "./OverviewTokenLabel";
import { RatesChart } from "./RatesChart";

type InfoTab = "overview" | "advanced" | "activity";

export function InfoTabs({ pool }: { pool: PoolDetailPanelPool }) {
  const [activeTab, setActiveTab] = useState<InfoTab>("overview");

  const overviewRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<InfoTab, React.RefObject<HTMLDivElement | null>> =
    {
      overview: overviewRef,
      advanced: advancedRef,
      activity: activityRef,
    };

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (["overview", "advanced", "activity"] as InfoTab[]).forEach((id) => {
      const el = sectionRefs[id].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveTab(id);
        },
        { threshold: 0.25 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToSection = (id: InfoTab) => {
    sectionRefs[id].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "advanced", label: "Advanced" },
    { id: "activity", label: "Activity" },
  ];

  const isLendingPool = pool.borrowApyLabel != null;
  const hasTwoTokens =
    pool.token2.symbol && pool.token2.symbol !== pool.token1.symbol;

  return (
    <div className="mt-8">
      <div
        className="sticky top-0 z-10 -mx-8 px-8 border-b border-white/5"
        style={{ background: "#111111" }}
      >
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => scrollToSection(t.id)}
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
        <h2 className="text-white text-xl font-bold mb-6">Overview</h2>
        <h3 className="text-white/50 text-sm font-medium mb-2">
          Market Attributes
        </h3>
        <div>
          {isLendingPool ? (
            <>
              <MarketAttributeRow label="Collateral">
                <OverviewTokenLabel token={pool.token1} />
              </MarketAttributeRow>
              {hasTwoTokens && (
                <MarketAttributeRow label="Loan">
                  <OverviewTokenLabel token={pool.token2} />
                </MarketAttributeRow>
              )}
              {pool.liquidationLtv > 0 && (
                <MarketAttributeRow label="Liquidation LTV">
                  {pool.liquidationLtv}%
                </MarketAttributeRow>
              )}
              {pool.utilization && (
                <MarketAttributeRow label="Utilization">
                  {pool.utilization}
                </MarketAttributeRow>
              )}
            </>
          ) : (
            <>
              <MarketAttributeRow label="Token 1">
                <OverviewTokenLabel token={pool.token1} />
              </MarketAttributeRow>
              {hasTwoTokens && (
                <MarketAttributeRow label="Token 2">
                  <OverviewTokenLabel token={pool.token2} />
                </MarketAttributeRow>
              )}
            </>
          )}
          {pool.oraclePrice && (
            <MarketAttributeRow label="Oracle price">
              {pool.oraclePrice}
            </MarketAttributeRow>
          )}
          {pool.poolType && (
            <MarketAttributeRow label="Pool type">
              {pool.poolType}
              {pool.poolTypeDetail && (
                <span className="text-white/40 ml-1.5">
                  ({pool.poolTypeDetail})
                </span>
              )}
            </MarketAttributeRow>
          )}
        </div>
      </div>

      <div ref={advancedRef} className="mt-16 scroll-mt-16">
        <h2 className="text-white text-xl font-bold mb-6">Advanced</h2>
        <RatesChart
          poolId={pool.id}
          supplyApy={pool.supplyApy}
          borrowApy={pool.borrowApyLabel}
        />
      </div>

      <div ref={activityRef} className="mt-16 scroll-mt-16 pb-16">
        <h2 className="text-white text-xl font-bold mb-6">Activity</h2>
        <ActivityFeed poolId={pool.id} />
      </div>
    </div>
  );
}
