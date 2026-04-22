"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Layers,
  Tag,
  Droplets,
  Activity,
  Info,
  ArrowDownUp,
} from "lucide-react";
import type { PoolCardData } from "@/features/pools/types/pools";
import { getPoolTokenIcon } from "../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { formatLiquidity } from "../../utils/poolUtils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PoolsTableProps {
  pools: PoolCardData[];
  isLoading: boolean;
  isFetching?: boolean;
  error: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveTypeLabel(type: string): string {
  if (type === "blend" || type === "neko") return "Lending";
  if (type === "soroswap") return "AMM";
  if (type === "aqua") return "Aqua AMM";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ── ColHeader ──────────────────────────────────────────────────────────────────

function ColHeader({
  icon: Icon,
  label,
  tooltip,
  centered,
}: {
  icon: React.ElementType;
  label: string;
  tooltip?: string;
  centered?: boolean;
}) {
  return (
    <th className={`px-4 py-3 ${centered ? "text-center" : "text-left"}`}>
      <div
        className={`flex items-center gap-1.5 text-white/40 text-xs font-semibold uppercase tracking-wide ${centered ? "justify-center" : ""}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
        {tooltip && (
          <div className="group relative">
            <Info className="h-3 w-3 cursor-help" />
            <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block w-48 rounded-lg bg-[#2A2A2A] px-2 py-1 text-[10px] text-white/70 shadow-xl z-50">
              {tooltip}
            </div>
          </div>
        )}
      </div>
    </th>
  );
}

// ── PoolCell ───────────────────────────────────────────────────────────────────

function PoolCell({ pool }: { pool: PoolCardData }) {
  const icon1 = getPoolTokenIcon({ type: "contract", code: pool.token1 });
  const icon2 = getPoolTokenIcon({ type: "contract", code: pool.token2 });

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-8 shrink-0">
        <div className="absolute left-0 w-8 h-8 rounded-full bg-neko-teal border-2 border-[#1C1C1C] flex items-center justify-center overflow-hidden shadow-md">
          {icon1 ? (
            <Image
              src={icon1}
              alt={pool.token1}
              width={32}
              height={32}
              unoptimized
              className={getTokenIconFitClass(pool.token1)}
            />
          ) : (
            <span className="text-white text-xs font-bold">
              {pool.token1[0]}
            </span>
          )}
        </div>
        <div className="absolute left-6 w-8 h-8 rounded-full bg-neko-teal-light border-2 border-[#1C1C1C] flex items-center justify-center overflow-hidden shadow-md">
          {icon2 ? (
            <Image
              src={icon2}
              alt={pool.token2}
              width={32}
              height={32}
              unoptimized
              className={getTokenIconFitClass(pool.token2)}
            />
          ) : (
            <span className="text-neko-navy text-xs font-bold">
              {pool.token2[0]}
            </span>
          )}
        </div>
      </div>
      <span className="text-white font-medium text-sm whitespace-nowrap">
        {pool.token1} / {pool.token2}
      </span>
    </div>
  );
}

// ── TypeBadge ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const label = resolveTypeLabel(type);
  const colorClass =
    type === "blend" || type === "neko"
      ? "bg-blue-500/20 text-blue-400"
      : type === "soroswap"
        ? "bg-purple-500/20 text-purple-400"
        : "bg-cyan-500/20 text-cyan-400";

  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

// ── StatusDot ──────────────────────────────────────────────────────────────────

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div
        className={`w-2 h-2 rounded-full ${
          isActive ? "bg-[#229EDF] animate-pulse" : "bg-white/20"
        }`}
      />
    </div>
  );
}

// ── LoadingRow / EmptyRow ──────────────────────────────────────────────────────

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12">
        <div className="mx-auto flex w-fit items-center gap-2 text-sm text-white/50">
          <span
            className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
            style={{ width: 14, height: 14 }}
            aria-hidden="true"
          />
          <span>Fetching pools…</span>
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
        className={`px-4 py-12 text-center text-sm ${
          variant === "error" ? "text-red-400" : "text-white/40"
        }`}
      >
        {message}
      </td>
    </tr>
  );
}

// ── StatCell (mobile) ─────────────────────────────────────────────────────────

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

// ── LiquidityCell ─────────────────────────────────────────────────────────────

function LiquidityCell({
  tokenAmount,
  tokenCode,
  fallback,
}: {
  tokenAmount?: string;
  tokenCode?: string;
  fallback: string;
}) {
  const { price, isLoading } = useTokenPrice(tokenCode);

  if (!tokenCode || !tokenAmount) {
    // Already USD (Aqua) — render as-is
    return <span className="text-white text-sm">{fallback}</span>;
  }

  if (isLoading) {
    return <span className="text-white/40 text-sm">…</span>;
  }

  const usd =
    price > 0
      ? formatLiquidity((parseFloat(tokenAmount) * price).toString())
      : fallback;

  return <span className="text-white text-sm">{usd}</span>;
}

// ── PoolsTable ─────────────────────────────────────────────────────────────────

const COL_SPAN = 5;

export function PoolsTable({
  pools,
  isLoading,
  isFetching = false,
  error,
}: PoolsTableProps) {
  const router = useRouter();
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <ColHeader icon={Layers} label="Pool" />
              <ColHeader icon={Tag} label="Type" />
              <ColHeader
                icon={Droplets}
                label="Total Supply"
                tooltip="Total value supplied to the pool"
                centered
              />
              <ColHeader
                icon={ArrowDownUp}
                label="Total Borrowed"
                tooltip="Total amount currently borrowed from this pool"
                centered
              />
              <ColHeader icon={Activity} label="Status" centered />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow colSpan={COL_SPAN} />
            ) : error ? (
              <EmptyRow
                colSpan={COL_SPAN}
                message={`Error loading pools: ${String(error)}`}
                variant="error"
              />
            ) : pools.length === 0 ? (
              <EmptyRow
                colSpan={COL_SPAN}
                message="No pools found. Try adjusting your filters."
              />
            ) : (
              pools.map((pool) => (
                <tr
                  key={pool.id}
                  onClick={() => router.push(`/pools/${pool.id}`)}
                  className="border-b border-white/5 last:border-0 hover:bg-[#2A2A2A] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-4 align-middle">
                    <PoolCell pool={pool} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <TypeBadge type={pool.type} />
                  </td>
                  <td className="px-4 py-4 align-middle text-center font-medium">
                    <LiquidityCell
                      tokenAmount={pool.liquidityTokenAmount}
                      tokenCode={pool.liquidityTokenCode}
                      fallback={pool.liquidity}
                    />
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-sm">
                    {pool.totalBorrowed === "-" ? (
                      <span className="text-white/30">—</span>
                    ) : (
                      <LiquidityCell
                        tokenAmount={pool.totalBorrowedTokenAmount}
                        tokenCode={pool.liquidityTokenCode}
                        fallback={pool.totalBorrowed}
                      />
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <StatusDot isActive={pool.isActive} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* isFetching indicator */}
      {isFetching && !isLoading && pools.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            <span
              className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
              style={{ width: 14, height: 14 }}
              aria-hidden="true"
            />
            <span>Fetching more pools…</span>
          </div>
        </div>
      )}

      {/* Mobile list */}
      <div className="md:hidden">
        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-white/40">
            Loading pools…
          </p>
        ) : error ? (
          <p className="px-4 py-12 text-center text-sm text-red-400">
            Error loading pools: {String(error)}
          </p>
        ) : pools.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-white/40">
            No pools found.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {pools.map((pool) => (
              <li
                key={pool.id}
                onClick={() => router.push(`/pools/${pool.id}`)}
                className="px-4 py-4 cursor-pointer hover:bg-[#2A2A2A] transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <PoolCell pool={pool} />
                  <div className="flex items-center gap-2">
                    <TypeBadge type={pool.type} />
                    <StatusDot isActive={pool.isActive} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCell
                    label="Supply"
                    value={pool.liquidity}
                    icon={Droplets}
                  />
                  <StatCell
                    label="Borrowed"
                    value={pool.totalBorrowed}
                    icon={ArrowDownUp}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
