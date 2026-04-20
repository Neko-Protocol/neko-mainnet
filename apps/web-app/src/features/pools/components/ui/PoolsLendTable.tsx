import React from "react";
import Image from "next/image";
import {
  ArrowLeftRight,
  TrendingUp,
  Droplets,
  Info,
} from "lucide-react";
import type { PoolCardData } from "@/features/pools/types/pools";
import { getPoolTokenIcon } from "../../utils/poolTokenIcons";

// ── ColHeader ────────────────────────────────────────────────────────────────

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

// ── ProtocolCell ──────────────────────────────────────────────────────────────

function ProtocolCell({ pool }: { pool: PoolCardData }) {
  const icon = getPoolTokenIcon({ type: "contract", code: pool.token1 });
  const protocolLabel =
    pool.type === "blend"
      ? "Blend"
      : pool.type.charAt(0).toUpperCase() + pool.type.slice(1);

  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-[#1a2a4a] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {icon ? (
          <Image
            src={icon}
            alt={pool.token1}
            width={28}
            height={28}
            unoptimized
          />
        ) : (
          <span className="text-white text-xs font-bold">
            {pool.token1.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-white font-medium text-sm">
        {pool.token1} Pool
      </span>
      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
        {protocolLabel}
      </span>
    </div>
  );
}

// ── PoolsLendTable ────────────────────────────────────────────────────────────

interface PoolsLendTableProps {
  pools: PoolCardData[];
  isLoading: boolean;
  isFetching?: boolean;
  error: unknown;
}

export function PoolsLendTable({
  pools,
  isLoading,
  isFetching = false,
  error,
}: PoolsLendTableProps) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <ColHeader icon={ArrowLeftRight} label="Protocol" />
              <ColHeader
                icon={TrendingUp}
                tooltip="Annual yield rate you earn by supplying assets"
                label="Supply APY"
                centered
              />
              <ColHeader
                icon={Droplets}
                tooltip="Total liquidity in pool"
                label="Total liquidity"
                centered
              />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow colSpan={3} message="fetching more pools" />
            ) : error ? (
              <EmptyRow
                colSpan={3}
                message={`Error loading pools: ${String(error)}`}
                variant="error"
              />
            ) : pools.length === 0 ? (
              <EmptyRow colSpan={3} message="No lending pools found." />
            ) : (
              pools.map((pool) => (
                <tr
                  key={pool.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-4 align-middle">
                    <ProtocolCell pool={pool} />
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {pool.roi}
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {pool.liquidity}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFetching && !isLoading && pools.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            <span
              className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
              style={{ width: 14, height: 14 }}
              aria-hidden="true"
            />
            <span>Fetching more pools</span>
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
            No lending pools found.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {pools.map((pool) => (
              <li key={pool.id} className="px-4 py-4">
                <div className="mb-3">
                  <ProtocolCell pool={pool} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCell label="Supply APY" value={pool.roi} icon={TrendingUp} />
                  <StatCell label="Liquidity" value={pool.liquidity} icon={Droplets} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function LoadingRow({ colSpan, message }: { colSpan: number; message: string }) {
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
