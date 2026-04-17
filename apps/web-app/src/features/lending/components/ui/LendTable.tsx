import React from "react";
import { ArrowLeftRight, TrendingUp, Droplets, Coins, Zap } from "lucide-react";
import { Pagination } from "@/features/borrowing/components/ui/Pagination";
import { ColHeader } from "./ColHeader";
import { ProtocolCell } from "./ProtocolCell";
import type { PoolData } from "../../types/lending";

interface LendTableProps {
  pools: PoolData[];
  paginatedPools: PoolData[];
  page: number;
  totalRows: number;
  totalPages: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (value: number) => void;
  isLoading: boolean;
  isFetching?: boolean;
  error: unknown;
  onDeposit: (pool: PoolData) => void;
  onWithdraw: (pool: PoolData) => void;
  hideActions?: boolean;
}

export function LendTable({
  pools,
  paginatedPools,
  page,
  totalRows,
  totalPages,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  isLoading,
  isFetching = false,
  error,
  onDeposit,
  onWithdraw,
  hideActions = false,
}: LendTableProps) {
  const colCount = hideActions ? 4 : 5;
  const isEmpty = !isLoading && !error && pools.length === 0;
  const filterEmpty =
    !isLoading && !error && pools.length > 0 && totalRows === 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-[#1C1C1C]">
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
              <ColHeader
                icon={Coins}
                tooltip="Rate at which you receive bTokens for each asset deposited"
                label="bToken Rate"
                centered
              />
              {!hideActions && (
                <ColHeader icon={Zap} label="Actions" centered />
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
              paginatedPools.map((pool) => (
                <tr
                  key={pool.id}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors"
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
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {pool.bTokenRate
                      ? parseFloat(pool.bTokenRate).toFixed(4)
                      : "1.0000"}
                  </td>
                  {!hideActions && (
                    <td className="px-4 py-4 align-middle text-center">
                      {pool.hideRowActions ? (
                        <span className="text-white/20 text-xs">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onDeposit(pool)}
                            className="rounded-lg bg-[#2A2A2A] hover:bg-[#333] px-4 py-1.5 text-white/70 hover:text-white text-xs font-semibold transition-colors"
                          >
                            Deposit
                          </button>
                          <button
                            onClick={() => onWithdraw(pool)}
                            className="rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] px-4 py-1.5 text-white text-xs font-semibold transition-colors"
                          >
                            Withdraw
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalRows > 0 && (
          <Pagination
            page={page}
            totalRows={totalRows}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        )}
      </div>

      {isFetching && !isLoading && pools.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <BottomFetchingIndicator />
        </div>
      )}

      {}
      <div className="md:hidden">
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
            <ul className="divide-y divide-white/5">
              {paginatedPools.map((pool) => (
              <li key={pool.id} className="px-4 py-4">
                {}
                <div className="mb-3">
                  <ProtocolCell pool={pool} />
                </div>

                {}
                <div className="grid grid-cols-3 gap-2 mb-4">
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
                    label="bToken Rate"
                    value={
                      pool.bTokenRate
                        ? parseFloat(pool.bTokenRate).toFixed(4)
                        : "1.0000"
                    }
                    icon={Coins}
                  />
                </div>

                {!hideActions && !pool.hideRowActions && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDeposit(pool)}
                      className="flex-1 rounded-lg bg-[#2A2A2A] hover:bg-[#333] px-4 py-2 text-white/70 hover:text-white text-sm font-semibold transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => onWithdraw(pool)}
                      className="flex-1 rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] px-4 py-2 text-white text-sm font-semibold transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                )}
              </li>
              ))}
            </ul>

            {totalRows > 0 && (
              <MobilePagination
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MobilePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-[#333] disabled:opacity-30"
      >
        ← Prev
      </button>
      <span className="text-xs text-white/40">
        {page + 1} / {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-[#333] disabled:opacity-30"
      >
        Next →
      </button>
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
