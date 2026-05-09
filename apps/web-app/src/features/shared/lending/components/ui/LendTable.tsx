import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import {
  convertUsdDisplayToSelectedCurrency,
  convertUsdToSelected,
  formatCompactCurrency,
} from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import {
  ArrowLeftRight,
  TrendingUp,
  Droplets,
  ArrowDownUp,
  Layers,
  Search,
  SlidersHorizontal,
  Settings,
  ListFilter,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  AlignJustify,
  Eye,
  EyeOff,
} from "lucide-react";
import { ColHeader } from "./ColHeader";
import type { PoolData } from "../../types/lending";
import { getPoolTokenIcon } from "@/features/shared/pools/utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { LENDING_PROTOCOL_LABELS } from "../../constants/protocols";

// ── Protocol icon map ──────────────────────────────────────────────────────────

const PROTOCOL_ICONS: Record<string, string> = {
  neko: "/neko-logo.png",
  soroswap: "/assets/vault-creators/soroswap.jpg",
  aqua: "https://coin-images.coingecko.com/coins/images/20026/small/aqua-logo.png?1696519446",
  blend: "/assets/vault-creators/blend.png",
};

// ── ProtocolDropdown ───────────────────────────────────────────────────────────

function ProtocolDropdown({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allOptions = [{ id: "all", label: "All protocols" }, ...options];
  const selected = allOptions.find((o) => o.id === value) ?? allOptions[0];

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => {
          if (!disabled && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 8, left: r.left });
          }
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        className="group inline-flex items-center gap-1.5 text-[10px] text-white/70 font-medium hover:text-white transition-colors disabled:opacity-50"
      >
        <SlidersHorizontal className="h-3 w-3 text-white/50 group-hover:text-white transition-colors shrink-0" />
        {selected.id !== "all" && PROTOCOL_ICONS[selected.id] && (
          <Image
            src={PROTOCOL_ICONS[selected.id]}
            alt={selected.label}
            width={16}
            height={16}
            unoptimized
            className="rounded-full object-cover w-4 h-4"
          />
        )}
        <span>{selected.label}</span>
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] min-w-[160px] rounded-xl border border-white/10 bg-[#1C1C1C] shadow-xl overflow-hidden"
            style={{ top: pos.top, left: pos.left }}
          >
            {allOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-[11px] transition-colors hover:bg-white/5 ${value === opt.id ? "text-white" : "text-white/60"}`}
              >
                {opt.id !== "all" &&
                  (PROTOCOL_ICONS[opt.id] ? (
                    <Image
                      src={PROTOCOL_ICONS[opt.id]}
                      alt={opt.label}
                      width={18}
                      height={18}
                      unoptimized
                      className="rounded-full object-cover w-[18px] h-[18px] shrink-0"
                    />
                  ) : (
                    <span className="w-[18px] h-[18px] rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {opt.label[0]}
                    </span>
                  ))}
                {opt.label}
                {value === opt.id && (
                  <span className="ml-auto text-[#229EDF]">✓</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

interface FilterState {
  apyMin: string;
  apyMax: string;
  liquidityMin: string;
  liquidityMax: string;
  selectedPools: string[];
}

const EMPTY_FILTERS: FilterState = {
  apyMin: "",
  apyMax: "",
  liquidityMin: "",
  liquidityMax: "",
  selectedPools: [],
};

function isFilterActive(f: FilterState) {
  return (
    f.apyMin !== "" ||
    f.apyMax !== "" ||
    f.liquidityMin !== "" ||
    f.liquidityMax !== "" ||
    f.selectedPools.length > 0
  );
}

function RangeRow({
  label,
  minVal,
  maxVal,
  unit,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minVal: string;
  maxVal: string;
  unit: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-white/50 font-medium mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            placeholder="Min"
            value={minVal}
            onChange={(e) => onMinChange(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg pl-3 pr-6 py-1.5 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-[#229EDF]/50 transition-colors"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30">
            {unit}
          </span>
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            placeholder="Max"
            value={maxVal}
            onChange={(e) => onMaxChange(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg pl-3 pr-6 py-1.5 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-[#229EDF]/50 transition-colors"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({
  filters,
  onChange,
  pools,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  pools: PoolData[];
}) {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const [open, setOpen] = useState(false);
  const [poolPanelOpen, setPoolPanelOpen] = useState(false);
  const [poolSearch, setPoolSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const active = isFilterActive(filters);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setPoolPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPoolList = pools.filter((p) => {
    const q = poolSearch.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.token1.toLowerCase().includes(q) ||
      p.token2.toLowerCase().includes(q)
    );
  });

  const togglePool = (id: string) => {
    const current = filters.selectedPools;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onChange({ ...filters, selectedPools: next });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setPoolPanelOpen(false);
        }}
        className={`group inline-flex items-center gap-1.5 text-[10px] font-medium transition-colors ${active ? "text-[#229EDF]" : "text-white/70 hover:text-white"}`}
      >
        <ListFilter
          className={`h-3 w-3 shrink-0 transition-colors ${active ? "text-[#229EDF]" : "text-white/50 group-hover:text-white"}`}
        />
        Filter
        {active && <span className="h-1.5 w-1.5 rounded-full bg-[#229EDF]" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 flex">
          {/* Left: range filters */}
          <div className="w-64 rounded-xl border border-white/10 bg-[#1C1C1C] shadow-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-medium text-white/50">
              <p>Pool</p>
              <button
                onClick={() => setPoolPanelOpen((o) => !o)}
                className={`flex items-center gap-1.5 transition-colors ${filters.selectedPools.length > 0 ? "text-[#229EDF]" : "hover:text-white"}`}
              >
                {filters.selectedPools.length > 0
                  ? `${filters.selectedPools.length} selected`
                  : "All"}
                <SlidersHorizontal className="h-3 w-3" />
              </button>
            </div>
            <div className="border-t border-white/5" />
            <RangeRow
              label="Supply APY"
              minVal={filters.apyMin}
              maxVal={filters.apyMax}
              unit="%"
              onMinChange={(v) => onChange({ ...filters, apyMin: v })}
              onMaxChange={(v) => onChange({ ...filters, apyMax: v })}
            />
            <RangeRow
              label="Total Liquidity"
              minVal={filters.liquidityMin}
              maxVal={filters.liquidityMax}
              unit={selectedCurrency}
              onMinChange={(v) => onChange({ ...filters, liquidityMin: v })}
              onMaxChange={(v) => onChange({ ...filters, liquidityMax: v })}
            />
            {active && (
              <button
                onClick={() => {
                  onChange(EMPTY_FILTERS);
                  setPoolPanelOpen(false);
                }}
                className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Right: pool selector panel */}
          {poolPanelOpen && (
            <div className="ml-1 w-60 rounded-xl border border-white/10 bg-[#1C1C1C] shadow-2xl flex flex-col overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search pools..."
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    className="w-full bg-[#141414] border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-[#229EDF]/40 transition-colors"
                  />
                  {poolSearch && (
                    <button
                      onClick={() => setPoolSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <ul className="overflow-y-auto max-h-64 py-1">
                {filteredPoolList.map((pool) => {
                  const tokenIcon = getPoolTokenIcon({
                    type: "contract",
                    code: pool.token1,
                  });
                  const icon =
                    tokenIcon ?? PROTOCOL_ICONS[pool.protocolId] ?? null;
                  const isSelected = filters.selectedPools.includes(pool.id);
                  const hasToken2 =
                    pool.token2 &&
                    pool.token2 !== "Lending" &&
                    pool.token2 !== "";
                  return (
                    <li key={pool.id}>
                      <button
                        onClick={() => togglePool(pool.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-[#229EDF] border-[#229EDF]" : "border-white/20"}`}
                        >
                          {isSelected && (
                            <span className="text-white text-[9px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        {icon ? (
                          <Image
                            src={icon}
                            alt={pool.token1}
                            width={18}
                            height={18}
                            unoptimized
                            className="rounded-full object-cover w-[18px] h-[18px] shrink-0"
                          />
                        ) : (
                          <span className="w-[18px] h-[18px] rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold shrink-0 text-white">
                            {pool.token1[0]}
                          </span>
                        )}
                        <span
                          className={`text-[11px] truncate ${isSelected ? "text-white" : "text-white/60"}`}
                        >
                          {pool.token1}
                          {hasToken2 ? ` / ${pool.token2}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SortDropdown ──────────────────────────────────────────────────────────────

type SortField = "name" | "roi" | "liquidity" | "totalBorrowed";
type SortOrder = "desc" | "asc";

interface SortState {
  field: SortField;
  order: SortOrder;
}

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "roi", label: "Supply APY" },
  { value: "liquidity", label: "Total Liquidity" },
  { value: "totalBorrowed", label: "Total Borrowed" },
  { value: "name", label: "Pool name" },
];

const DEFAULT_SORT: SortState = { field: "liquidity", order: "desc" };

function SortDropdown({
  sort,
  onChange,
}: {
  sort: SortState;
  onChange: (s: SortState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fieldLabel =
    SORT_FIELDS.find((f) => f.value === sort.field)?.label ?? "Sort";

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 8, left: r.left });
          }
          setOpen((o) => !o);
        }}
        className="group inline-flex items-center gap-1.5 text-[10px] text-white/70 font-medium hover:text-white transition-colors"
      >
        {sort.order === "desc" ? (
          <ArrowDown className="h-3 w-3 text-white/50 group-hover:text-white transition-colors shrink-0" />
        ) : (
          <ArrowUp className="h-3 w-3 text-white/50 group-hover:text-white transition-colors shrink-0" />
        )}
        Sort by {fieldLabel}
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-56 rounded-xl border border-white/10 bg-[#1C1C1C] shadow-2xl overflow-hidden"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* Order section */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">
                Order
              </p>
              {(["desc", "asc"] as SortOrder[]).map((o) => (
                <button
                  key={o}
                  onClick={() => onChange({ ...sort, order: o })}
                  className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-white/5 text-white/70 hover:text-white"
                >
                  {o === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {o === "desc" ? "Descending" : "Ascending"}
                  {sort.order === o && (
                    <span className="ml-auto text-[#229EDF]">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mx-3 my-2 border-t border-white/5" />

            {/* Sort by section */}
            <div className="px-3 pb-3">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">
                Sort by
              </p>
              {SORT_FIELDS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    onChange({ ...sort, field: f.value });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-white/5 text-white/70 hover:text-white"
                >
                  {f.label}
                  {sort.field === f.value && (
                    <span className="ml-auto text-[#229EDF]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ── ColumnsDropdown ───────────────────────────────────────────────────────────

export type ColumnKey =
  | "protocol"
  | "pool"
  | "apy"
  | "liquidity"
  | "totalBorrowed"
  | "borrow";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "protocol", label: "Protocol" },
  { key: "pool", label: "Pool" },
  { key: "apy", label: "Supply APY" },
  { key: "liquidity", label: "Total Liquidity" },
  { key: "totalBorrowed", label: "Total Borrowed" },
  { key: "borrow", label: "Borrow APY" },
];

export const DEFAULT_VISIBLE_COLUMNS: Set<ColumnKey> = new Set([
  "protocol",
  "pool",
  "apy",
  "liquidity",
  "totalBorrowed",
  "borrow",
]);

function ColumnsDropdown({
  visible,
  onChange,
}: {
  visible: Set<ColumnKey>;
  onChange: (next: Set<ColumnKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = ALL_COLUMNS.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (key: ColumnKey) => {
    const next = new Set(visible);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 8, left: r.right - 256 });
          }
          setOpen((o) => !o);
        }}
        className="flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
        title="Manage columns"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-64 rounded-xl border border-white/10 bg-[#1C1C1C] shadow-2xl overflow-hidden"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#229EDF]/40 transition-colors"
                />
              </div>
            </div>

            {/* Column list */}
            <ul className="py-1 max-h-72 overflow-y-auto">
              {filtered.map((col) => {
                const isVisible = visible.has(col.key);
                return (
                  <li key={col.key}>
                    <button
                      onClick={() => toggle(col.key)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <AlignJustify className="h-3.5 w-3.5 text-white/20 shrink-0" />
                      <span
                        className={`flex-1 text-left text-[12px] font-medium ${isVisible ? "text-white" : "text-white/30"}`}
                      >
                        {col.label}
                      </span>
                      {isVisible ? (
                        <Eye className="h-4 w-4 text-white/50 shrink-0" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-white/20 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

// ── PricedCell ────────────────────────────────────────────────────────────────

function PricedCell({
  tokenAmount,
  tokenCode,
  fallback,
}: {
  tokenAmount?: string;
  tokenCode?: string;
  fallback: string;
}) {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const { price } = useTokenPrice(tokenCode);
  if (tokenAmount && tokenCode && price > 0) {
    const usd = parseFloat(tokenAmount) * price;
    return (
      <span className="text-white">
        {formatCompactCurrency(
          convertUsdToSelected(usd, fxRate),
          selectedCurrency,
          SUMMARY_DISPLAY_DECIMALS
        )}
      </span>
    );
  }
  return (
    <span className="text-white">
      {convertUsdDisplayToSelectedCurrency(
        fallback,
        fxRate,
        selectedCurrency,
        SUMMARY_DISPLAY_DECIMALS
      )}
    </span>
  );
}

// ── ProtocolNameCell ──────────────────────────────────────────────────────────

function ProtocolNameCell({ pool }: { pool: PoolData }) {
  const icon = PROTOCOL_ICONS[pool.protocolId];
  const label = LENDING_PROTOCOL_LABELS[pool.protocolId] ?? pool.protocolId;
  return (
    <div className="flex items-center gap-2">
      {icon ? (
        <Image
          src={icon}
          alt={label}
          width={24}
          height={24}
          unoptimized
          className="rounded-full object-cover w-6 h-6 shrink-0"
        />
      ) : (
        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold shrink-0 text-white">
          {label[0]}
        </span>
      )}
      <span className="text-white font-medium text-sm">{label}</span>
    </div>
  );
}

// ── PoolPairCell ──────────────────────────────────────────────────────────────

function PoolPairCell({ pool }: { pool: PoolData }) {
  const icon1 = getPoolTokenIcon({ type: "contract", code: pool.token1 });
  const hasToken2 =
    pool.token2 && pool.token2 !== "Lending" && pool.token2 !== "";
  const icon2 = hasToken2
    ? getPoolTokenIcon({ type: "contract", code: pool.token2 })
    : null;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative shrink-0"
        style={{ width: hasToken2 ? 36 : 24, height: 24 }}
      >
        <div className="absolute left-0 w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
          {icon1 ? (
            <Image
              src={icon1}
              alt={pool.token1}
              width={24}
              height={24}
              unoptimized
              className={getTokenIconFitClass(pool.token1)}
            />
          ) : (
            <span className="text-white text-[9px] font-bold">
              {pool.token1[0]}
            </span>
          )}
        </div>
        {hasToken2 && (
          <div className="absolute left-3 w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
            {icon2 ? (
              <Image
                src={icon2}
                alt={pool.token2}
                width={24}
                height={24}
                unoptimized
                className={getTokenIconFitClass(pool.token2)}
              />
            ) : (
              <span className="text-white text-[9px] font-bold">
                {pool.token2[0]}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-white text-sm font-medium whitespace-nowrap">
        {pool.token1}
        {hasToken2 ? ` / ${pool.token2}` : ""}
      </span>
    </div>
  );
}

interface LendTableProps {
  pools: PoolData[];
  isLoading: boolean;
  isFetching?: boolean;
  error: unknown;
  // Toolbar
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  protocolFilter?: string;
  onProtocolFilterChange?: (id: string) => void;
  protocolOptions?: { id: string; label: string }[];
  /** When true, table card has no min-height (e.g. embedded in dashboard). */
  compact?: boolean;
}

export function LendTable({
  pools,
  isLoading,
  isFetching = false,
  error,
  searchQuery = "",
  onSearchChange,
  protocolFilter = "all",
  onProtocolFilterChange,
  protocolOptions = [],
  compact = false,
}: LendTableProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(DEFAULT_VISIBLE_COLUMNS)
  );

  // Apply protocol filter, search, range filters, and sort locally
  const displayPools = useMemo(() => {
    let result = [...pools];

    if (protocolFilter !== "all") {
      result = result.filter((p) => p.protocolId === protocolFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.token1.toLowerCase().includes(q) ||
          p.token2.toLowerCase().includes(q)
      );
    }

    if (filters.selectedPools.length > 0) {
      result = result.filter((p) => filters.selectedPools.includes(p.id));
    }

    if (
      filters.apyMin !== "" ||
      filters.apyMax !== "" ||
      filters.liquidityMin !== "" ||
      filters.liquidityMax !== ""
    ) {
      result = result.filter((pool) => {
        const apy = parseFloat(pool.roi.replace("%", ""));
        const liq =
          parseFloat(pool.liquidity.replace(/[^0-9.]/g, "")) *
          (pool.liquidity.includes("M")
            ? 1_000_000
            : pool.liquidity.includes("k")
              ? 1_000
              : 1);
        if (filters.apyMin !== "" && apy < parseFloat(filters.apyMin))
          return false;
        if (filters.apyMax !== "" && apy > parseFloat(filters.apyMax))
          return false;
        if (
          filters.liquidityMin !== "" &&
          liq < parseFloat(filters.liquidityMin)
        )
          return false;
        if (
          filters.liquidityMax !== "" &&
          liq > parseFloat(filters.liquidityMax)
        )
          return false;
        return true;
      });
    }

    result.sort((a, b) => {
      let av = 0,
        bv = 0;
      if (sort.field === "roi") {
        av = parseFloat(a.roi.replace("%", ""));
        bv = parseFloat(b.roi.replace("%", ""));
      } else if (sort.field === "liquidity") {
        const parse = (s: string) =>
          parseFloat(s.replace(/[^0-9.]/g, "")) *
          (s.includes("M") ? 1_000_000 : s.includes("k") ? 1_000 : 1);
        av = parse(a.liquidity);
        bv = parse(b.liquidity);
      } else if (sort.field === "totalBorrowed") {
        const parse = (s: string | undefined) =>
          parseFloat((s ?? "0").replace(/[^0-9.]/g, "")) *
          ((s ?? "").includes("M")
            ? 1_000_000
            : (s ?? "").includes("k")
              ? 1_000
              : 1);
        av = parse(a.totalBorrowed);
        bv = parse(b.totalBorrowed);
      } else {
        return sort.order === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return sort.order === "asc" ? av - bv : bv - av;
    });

    return result;
  }, [pools, filters, sort, protocolFilter, searchQuery]);

  const col = (key: ColumnKey) => visibleColumns.has(key);
  const colCount = (
    [
      "protocol",
      "pool",
      "apy",
      "liquidity",
      "totalBorrowed",
      "borrow",
    ] as ColumnKey[]
  ).filter((k) => col(k)).length;
  const isEmpty = !isLoading && !error && pools.length === 0;
  const filterEmpty =
    !isLoading && !error && pools.length > 0 && displayPools.length === 0;

  const showToolbar =
    !!onSearchChange ||
    (protocolOptions.length > 0 && !!onProtocolFilterChange);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-[#1C1C1C]">
      {/* ── Toolbar ─────────────────────── */}
      {showToolbar && (
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/5 rounded-t-2xl bg-[#1C1C1C]">
          {/* Filters */}
          <div className="flex items-center gap-6">
            {protocolOptions.length > 0 && onProtocolFilterChange && (
              <ProtocolDropdown
                value={protocolFilter}
                onChange={(id) => {
                  onProtocolFilterChange(id);
                  setFilters((f) => ({ ...f, selectedPools: [] }));
                }}
                options={protocolOptions}
                disabled={isLoading}
              />
            )}
            <FilterDropdown
              filters={filters}
              onChange={(next) => {
                // Reset selected pools that no longer belong to the active protocol
                const scopedPools =
                  protocolFilter === "all"
                    ? pools
                    : pools.filter((p) => p.protocolId === protocolFilter);
                const scopedIds = new Set(scopedPools.map((p) => p.id));
                const filteredSelected = next.selectedPools.filter((id) =>
                  scopedIds.has(id)
                );
                setFilters({ ...next, selectedPools: filteredSelected });
              }}
              pools={
                protocolFilter === "all"
                  ? pools
                  : pools.filter((p) => p.protocolId === protocolFilter)
              }
            />
            <SortDropdown sort={sort} onChange={setSort} />
          </div>

          {/* Search */}
          {onSearchChange && (
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Filter pools..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-transparent border border-white/15 rounded-full pl-8 pr-4 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 hover:border-white/25 transition-colors"
                />
              </div>
              <ColumnsDropdown
                visible={visibleColumns}
                onChange={setVisibleColumns}
              />
            </div>
          )}
        </div>
      )}
      <div
        className={`hidden md:block overflow-y-auto max-h-[600px] rounded-b-2xl ${compact ? "" : "min-h-[420px]"}`}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-[#1C1C1C] z-10">
            <tr className="border-b border-white/5">
              {col("protocol") && (
                <ColHeader icon={ArrowLeftRight} label="Protocol" />
              )}
              {col("pool") && <ColHeader icon={Layers} label="Pool" />}
              {col("apy") && (
                <ColHeader
                  icon={TrendingUp}
                  tooltip="Annual yield rate you earn by supplying assets"
                  label="Supply APY"
                  centered
                />
              )}
              {col("liquidity") && (
                <ColHeader
                  icon={Droplets}
                  tooltip="Total liquidity in pool"
                  label="Total liquidity"
                  centered
                />
              )}
              {col("totalBorrowed") && (
                <ColHeader
                  icon={ArrowDownUp}
                  tooltip="Total amount currently borrowed from this pool"
                  label="Total Borrowed"
                  centered
                />
              )}
              {col("borrow") && (
                <ColHeader
                  icon={TrendingUp}
                  tooltip="Annual cost to borrow from this pool"
                  label="Borrow APY"
                  centered
                />
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow colSpan={colCount} message="fetching more pools" />
            ) : error ? (
              <EmptyRow
                colSpan={colCount}
                message={`Error loading pools: ${String(error)}`}
                variant="error"
              />
            ) : pools.length === 0 ? (
              <EmptyRow colSpan={colCount} message="Loading pools..." />
            ) : filterEmpty ? (
              <EmptyRow
                colSpan={colCount}
                message="No pools match this protocol."
              />
            ) : (
              displayPools.map((pool) => (
                <tr
                  key={pool.id}
                  onClick={() => {
                    const id = pool.orchestratorId ?? pool.contractId;
                    if (id) router.push(`/pools/${encodeURIComponent(id)}`);
                  }}
                  className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${(pool.orchestratorId ?? pool.contractId) ? "cursor-pointer" : ""}`}
                >
                  {col("protocol") && (
                    <td className="px-4 py-4 align-middle">
                      <ProtocolNameCell pool={pool} />
                    </td>
                  )}
                  {col("pool") && (
                    <td className="px-4 py-4 align-middle">
                      <PoolPairCell pool={pool} />
                    </td>
                  )}
                  {col("apy") && (
                    <td className="px-4 py-4 align-middle text-center text-white text-sm">
                      {pool.roi}
                    </td>
                  )}
                  {col("liquidity") && (
                    <td className="px-4 py-4 align-middle text-center text-sm">
                      <PricedCell
                        tokenAmount={pool.liquidityTokenAmount}
                        tokenCode={pool.liquidityTokenCode}
                        fallback={pool.liquidity}
                      />
                    </td>
                  )}
                  {col("totalBorrowed") && (
                    <td className="px-4 py-4 align-middle text-center text-sm">
                      {pool.totalBorrowed ? (
                        <PricedCell
                          tokenAmount={pool.totalBorrowedTokenAmount}
                          tokenCode={pool.liquidityTokenCode}
                          fallback={pool.totalBorrowed}
                        />
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                  )}
                  {col("borrow") && (
                    <td className="px-4 py-4 align-middle text-center text-sm">
                      {pool.borrowApy ? (
                        <span className="text-white">{pool.borrowApy}</span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFetching && !isLoading && pools.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <BottomFetchingIndicator />
        </div>
      )}

      {}
      <div className={`md:hidden ${compact ? "" : "min-h-[420px]"}`}>
        {isLoading ? (
          <MobileEmptyState message="Loading pools…" />
        ) : error ? (
          <MobileEmptyState
            message={`Error loading pools: ${String(error)}`}
            variant="error"
          />
        ) : isEmpty ? (
          <MobileEmptyState message="Loading Pools..." />
        ) : filterEmpty ? (
          <MobileEmptyState message="No pools match this protocol." />
        ) : (
          <>
            <ul className="divide-y divide-white/5 overflow-y-auto max-h-[600px]">
              {displayPools.map((pool) => (
                <li
                  key={pool.id}
                  onClick={() => {
                    const id = pool.orchestratorId ?? pool.contractId;
                    if (id) router.push(`/pools/${encodeURIComponent(id)}`);
                  }}
                  className={`px-4 py-4 hover:bg-white/[0.04] transition-colors ${(pool.orchestratorId ?? pool.contractId) ? "cursor-pointer" : ""}`}
                >
                  <div className="mb-1 flex items-center gap-3">
                    <ProtocolNameCell pool={pool} />
                    <PoolPairCell pool={pool} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCell
                      label="Supply APY"
                      value={pool.roi}
                      icon={TrendingUp}
                    />
                    <StatCell
                      label="Liquidity"
                      value={pool.liquidity}
                      icon={Droplets}
                    />
                    <StatCell
                      label="Borrowed"
                      value={pool.totalBorrowed ?? "—"}
                      icon={ArrowDownUp}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12">
        <div className="mx-auto flex w-fit items-center justify-center gap-2 text-sm text-white/50">
          <span
            className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
            style={{ width: 14, height: 14 }}
            aria-hidden="true"
          />
          <span>{message}</span>
        </div>
      </td>
    </tr>
  );
}

function EmptyRow({
  colSpan,
  message,
  variant = "muted",
}: {
  colSpan: number;
  message: string;
  variant?: "muted" | "error";
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`px-4 py-12 text-center text-sm ${variant === "error" ? "text-red-400" : "text-white/40"}`}
      >
        {message}
      </td>
    </tr>
  );
}

function MobileEmptyState({
  message,
  variant = "muted",
}: {
  message: string;
  variant?: "muted" | "error";
}) {
  return (
    <p
      className={`px-4 py-12 text-center text-sm ${variant === "error" ? "text-red-400" : "text-white/40"}`}
    >
      {message}
    </p>
  );
}

function BottomFetchingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-white/50">
      <span
        className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
        style={{ width: 14, height: 14 }}
        aria-hidden="true"
      />
      <span>Fetching more pools</span>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-[#242424] px-2 py-2.5">
      <div className="flex items-center gap-1 text-white/40">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}
