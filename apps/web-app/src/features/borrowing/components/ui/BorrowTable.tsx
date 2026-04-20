import React from "react";
import { Layers, TrendingDown, Shield, Droplets, Zap } from "lucide-react";
import { ColHeader } from "./ColHeader";
import { PoolCell } from "./PoolCell";
import { Pagination } from "./Pagination";
import type { BorrowTableAsset } from "../../types/borrowing";

interface BorrowTableProps {
  assets: BorrowTableAsset[];
  paginatedAssets: BorrowTableAsset[];
  isLoading: boolean;
  isFetching?: boolean;
  poolsError: unknown;
  page: number;
  totalRows: number;
  totalPages: number;
  rowsPerPage: number;
  onBorrow: (asset: BorrowTableAsset) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (value: number) => void;
}

export function BorrowTable({
  assets,
  paginatedAssets,
  isLoading,
  isFetching = false,
  poolsError,
  page,
  totalRows,
  totalPages,
  rowsPerPage,
  onBorrow,
  onPageChange,
  onRowsPerPageChange,
}: BorrowTableProps) {
  const isEmpty = !isLoading && !poolsError && assets.length === 0;

  return (
    <div className="w-full rounded-2xl border border-white/5 bg-[#1C1C1C]">
      {/* Desktop */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <ColHeader icon={Layers} label="Pool" centered />
              <ColHeader
                icon={TrendingDown}
                label="Borrow APR"
                tooltip="Annual interest rate you pay when borrowing"
                centered
              />
              <ColHeader
                icon={Shield}
                label="Collateral"
                tooltip="Maximum percentage of collateral value you can borrow"
                centered
              />
              <ColHeader
                icon={Droplets}
                label="Liquidity"
                tooltip="Total liquidity in pool"
                centered
              />
              <ColHeader icon={Zap} label="Actions" centered />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow colSpan={5} message="Loading borrow pools..." />
            ) : poolsError ? (
              <EmptyRow
                colSpan={5}
                message={`Error loading borrow pools: ${String(poolsError)}`}
                variant="error"
              />
            ) : assets.length === 0 ? (
              <EmptyRow colSpan={5} message="Loading borrow pools..." />
            ) : (
              paginatedAssets.map((asset) => (
                <tr
                  key={asset.rowId}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-4 align-middle w-[280px]">
                    <PoolCell
                      token1={asset.pool.token1}
                      token2={asset.pool.token2}
                      fee={asset.pool.fee}
                      isAggregated={asset.isAggregated}
                      label={asset.pool.label}
                    />
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {asset.borrowApr}
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {asset.collateralFactorDisplay}
                  </td>
                  <td className="px-4 py-4 align-middle text-center text-white text-sm">
                    {asset.liquidity}
                  </td>
                  <td className="px-4 py-4 align-middle text-center">
                    <button
                      onClick={() => onBorrow(asset)}
                      className="rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] px-4 py-1.5 text-white text-xs font-semibold transition-colors"
                    >
                      Borrow
                    </button>
                  </td>
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

      {isFetching && !isLoading && assets.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <BottomFetchingIndicator />
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden">
        {isLoading ? (
          <MobileLoadingState message="Loading borrow pools..." />
        ) : poolsError ? (
          <MobileEmptyState
            message={`Error loading borrow pools: ${String(poolsError)}`}
            variant="error"
          />
        ) : isEmpty ? (
          <MobileEmptyState message="Loading borrow pools..." />
        ) : (
          <>
            <ul className="divide-y divide-white/5">
              {paginatedAssets.map((asset) => (
                <li key={asset.rowId} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <PoolCell
                      token1={asset.pool.token1}
                      token2={asset.pool.token2}
                      fee={asset.pool.fee}
                      isAggregated={asset.isAggregated}
                      label={asset.pool.label}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <StatCell
                      label="APR"
                      value={asset.borrowApr}
                      icon={TrendingDown}
                    />
                    <StatCell
                      label="Collateral"
                      value={asset.collateralFactorDisplay}
                      icon={Shield}
                    />
                    <StatCell
                      label="Liquidity"
                      value={asset.liquidity}
                      icon={Droplets}
                    />
                  </div>

                  <button
                    onClick={() => onBorrow(asset)}
                    className="w-full rounded-lg bg-[#229EDF] hover:bg-[#1a8bc7] px-4 py-2 text-white text-sm font-semibold transition-colors"
                  >
                    Borrow
                  </button>
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
        <div className="flex items-center justify-center gap-3 text-sm text-white/50">
          <span
            className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
            style={{ width: 16, height: 16 }}
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

function MobileLoadingState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12">
      <div className="flex items-center justify-center gap-3 text-sm text-white/50">
        <span
          className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
          style={{ width: 16, height: 16 }}
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
    </div>
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
      <span>fetching more pools</span>
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
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-white/60 disabled:opacity-30 transition-colors hover:bg-[#333]"
      >
        ← Prev
      </button>
      <span className="text-xs text-white/40">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-white/60 disabled:opacity-30 transition-colors hover:bg-[#333]"
      >
        Next →
      </button>
    </div>
  );
}

export default BorrowTable;
