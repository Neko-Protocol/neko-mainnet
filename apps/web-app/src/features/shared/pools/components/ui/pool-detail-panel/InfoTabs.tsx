"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { PoolDetailPanelPool } from "./types";
import { ActivityFeed } from "./ActivityFeed";
import { MarketAttributeRow } from "./MarketAttributeRow";
import { OverviewTokenLabel } from "./OverviewTokenLabel";
import { RatesChart } from "./RatesChart";
import { POOL_DETAIL_MAIN_SCROLL_ID } from "./scrollIds";

type InfoTab = "overview" | "advanced" | "activity";

/** DOM / URL anchors  use `#pool-detail-overview` etc. */
export const POOL_DETAIL_SECTION_IDS = {
  overview: "pool-detail-overview",
  advanced: "pool-detail-advanced",
  activity: "pool-detail-activity",
} as const satisfies Record<InfoTab, string>;

/** Flow spacer + scroll spy offset when the bar is fixed to the scroll column */
const POOL_DETAIL_TAB_BAR_HEIGHT_PX = 56;

function hashToTab(hash: string): InfoTab | null {
  const key = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!key) return null;
  const entries = Object.entries(POOL_DETAIL_SECTION_IDS) as [
    InfoTab,
    string,
  ][];
  for (const [tab, domId] of entries) {
    if (key === domId || key === tab) return tab;
  }
  return null;
}

export function InfoTabs({ pool }: { pool: PoolDetailPanelPool }) {
  const [activeTab, setActiveTab] = useState<InfoTab>("overview");
  const [pinned, setPinned] = useState(false);
  const [dockRect, setDockRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRafPendingRef = useRef(false);

  const syncScrollUi = useCallback(() => {
    const scrollRoot = document.getElementById(POOL_DETAIL_MAIN_SCROLL_ID);
    const sentinel = sentinelRef.current;

    let pin = false;
    if (scrollRoot && sentinel) {
      pin =
        sentinel.getBoundingClientRect().top <=
        scrollRoot.getBoundingClientRect().top + 1;
    }

    setPinned((p) => (p !== pin ? pin : p));

    const order: InfoTab[] = ["overview", "advanced", "activity"];
    let line: number;
    if (scrollRoot) {
      const rr = scrollRoot.getBoundingClientRect();
      line = pin
        ? rr.top + POOL_DETAIL_TAB_BAR_HEIGHT_PX + 8
        : rr.top + Math.min(rr.height * 0.22, 140);
    } else {
      line = Math.round(window.innerHeight * 0.22);
    }

    let current: InfoTab = "overview";
    for (const id of order) {
      const el = document.getElementById(POOL_DETAIL_SECTION_IDS[id]);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= line) current = id;
    }
    setActiveTab((prev) => (prev === current ? prev : current));
  }, []);

  const scheduleScrollSync = useCallback(() => {
    if (scrollRafPendingRef.current) return;
    scrollRafPendingRef.current = true;
    requestAnimationFrame(() => {
      scrollRafPendingRef.current = false;
      syncScrollUi();
    });
  }, [syncScrollUi]);

  useLayoutEffect(() => {
    const root = document.getElementById(POOL_DETAIL_MAIN_SCROLL_ID);
    if (!root) return;

    const measure = () => {
      const r = root.getBoundingClientRect();
      setDockRect((prev) => {
        const next = { top: r.top, left: r.left, width: r.width };
        if (
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width
        ) {
          return prev;
        }
        return next;
      });
      queueMicrotask(() => syncScrollUi());
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [syncScrollUi]);

  useEffect(() => {
    const scrollRoot = document.getElementById(POOL_DETAIL_MAIN_SCROLL_ID);
    if (!scrollRoot) return;

    syncScrollUi();

    const opts = { passive: true } as const;
    scrollRoot.addEventListener("scroll", scheduleScrollSync, opts);
    if ("onscrollend" in scrollRoot) {
      scrollRoot.addEventListener(
        "scrollend",
        syncScrollUi as EventListener,
        opts
      );
    }

    return () => {
      scrollRoot.removeEventListener("scroll", scheduleScrollSync);
      if ("onscrollend" in scrollRoot) {
        scrollRoot.removeEventListener(
          "scrollend",
          syncScrollUi as EventListener
        );
      }
    };
  }, [scheduleScrollSync, syncScrollUi]);

  useEffect(() => {
    const tab = hashToTab(window.location.hash);
    if (!tab) return;
    requestAnimationFrame(() => {
      document
        .getElementById(POOL_DETAIL_SECTION_IDS[tab])
        ?.scrollIntoView({ behavior: "auto", block: "start" });
      setActiveTab(tab);
      requestAnimationFrame(scheduleScrollSync);
    });
  }, [scheduleScrollSync]);

  const scrollToSection = (id: InfoTab) => {
    const domId = POOL_DETAIL_SECTION_IDS[id];
    document.getElementById(domId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${domId}`);
    setActiveTab(id);
    scheduleScrollSync();
  };

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "advanced", label: "Advanced" },
    { id: "activity", label: "Activity" },
  ];

  const isLendingPool = pool.borrowApyLabel != null;
  const hasTwoTokens =
    pool.token2.symbol && pool.token2.symbol !== pool.token1.symbol;

  const sectionScrollMargin = "scroll-mt-[calc(56px+1rem)]";

  const showFixed = pinned && dockRect !== null;

  return (
    <div className="mt-8">
      {/* Pin fixed bar once this edge reaches the top of the scroll column */}
      <div
        ref={sentinelRef}
        className="pointer-events-none h-px w-full shrink-0"
        aria-hidden
      />

      {showFixed ? (
        <div
          className="shrink-0"
          style={{ height: POOL_DETAIL_TAB_BAR_HEIGHT_PX }}
          aria-hidden
        />
      ) : null}

      <header
        className={cn(
          "box-border shrink-0 border-b border-white/10 px-8 pb-3 pt-3",
          "isolate bg-[#111111]/55 backdrop-blur-2xl backdrop-saturate-150",
          "supports-backdrop-filter:bg-[#111111]/32",
          "motion-safe:transition-[backdrop-filter,background-color] motion-safe:duration-300 motion-safe:ease-out",
          showFixed ? "fixed z-30" : "relative z-20"
        )}
        style={
          showFixed
            ? {
                top: dockRect.top,
                left: dockRect.left,
                width: dockRect.width,
              }
            : undefined
        }
      >
        <nav
          className="relative z-10 flex gap-6"
          role="tablist"
          aria-label="Pool info sections"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              id={`pool-detail-tab-${t.id}`}
              aria-controls={POOL_DETAIL_SECTION_IDS[t.id]}
              onClick={() => scrollToSection(t.id)}
              className={cn(
                "relative pb-1 text-sm font-medium",
                "motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
                activeTab === t.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-0 left-0 right-0 mx-auto h-0.5 max-w-full origin-center rounded-full bg-white",
                  "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  activeTab === t.id
                    ? "opacity-100 scale-x-100"
                    : "scale-x-60 opacity-0"
                )}
              />
            </button>
          ))}
        </nav>
      </header>

      <section
        id={POOL_DETAIL_SECTION_IDS.overview}
        aria-labelledby="pool-detail-tab-overview"
        className={cn("mt-10 pb-2", sectionScrollMargin)}
      >
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
      </section>

      <section
        id={POOL_DETAIL_SECTION_IDS.advanced}
        aria-labelledby="pool-detail-tab-advanced"
        className={cn("mt-16 pb-2", sectionScrollMargin)}
      >
        <h2 className="text-white text-xl font-bold mb-6">Advanced</h2>
        <RatesChart
          poolId={pool.id}
          supplyApy={pool.supplyApy}
          borrowApy={pool.borrowApyLabel}
        />
      </section>

      <section
        id={POOL_DETAIL_SECTION_IDS.activity}
        aria-labelledby="pool-detail-tab-activity"
        className={cn("mt-16 pb-16", sectionScrollMargin)}
      >
        <h2 className="text-white text-xl font-bold mb-6">Activity</h2>
        <ActivityFeed poolId={pool.id} />
      </section>
    </div>
  );
}
