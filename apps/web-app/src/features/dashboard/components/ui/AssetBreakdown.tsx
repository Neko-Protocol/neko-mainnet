"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDashboardPools } from "@/features/dashboard/hooks/useDashboardPools";
import { LendTable } from "@/features/lending/components/ui/LendTable";
import { LendProtocolFilter } from "@/features/lending/components/ui/LendProtocolFilter";
import type { PoolData } from "@/features/lending/types/lending";
import {
  LENDING_PROTOCOL_LABELS,
  LENDING_PROTOCOL_ORDER,
} from "@/features/lending/constants/protocols";

const AssetBreakdown: React.FC = () => {
  const router = useRouter();
  const { assets, isLoading, error } = useDashboardPools();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [protocolFilter, setProtocolFilterState] = useState("all");

  const protocolOptions = useMemo(() => {
    const ids = new Set(assets.map((p) => p.protocolId));
    const order = LENDING_PROTOCOL_ORDER as readonly string[];
    const known = order
      .filter((id) => ids.has(id))
      .map((id) => ({ id, label: LENDING_PROTOCOL_LABELS[id] ?? id }));
    const unknown = [...ids].filter((id) => !order.includes(id));
    const extras = unknown.map((id) => ({
      id,
      label: LENDING_PROTOCOL_LABELS[id] ?? id,
    }));
    return [...known, ...extras];
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (protocolFilter === "all") return assets;
    return assets.filter((p) => p.protocolId === protocolFilter);
  }, [assets, protocolFilter]);

  const totalRows = filteredAssets.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedPools = useMemo(
    () => filteredAssets.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredAssets, page, rowsPerPage]
  );

  const setProtocolFilter = useCallback((id: string) => {
    setProtocolFilterState(id);
    setPage(0);
  }, []);

  const changeRowsPerPage = useCallback((value: number) => {
    setRowsPerPage(value);
    setPage(0);
  }, []);

  const handleAction = (_pool: PoolData) => router.push("/lending");

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Top Pools
          </h2>
          <p className="text-white/40 text-sm">
            Overview of the most active pools
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {protocolOptions.length > 0 && (
            <LendProtocolFilter
              id="dashboard-lend-protocol"
              value={protocolFilter}
              onChange={setProtocolFilter}
              options={protocolOptions}
              disabled={isLoading}
            />
          )}
          <Link
            href="/lending"
            className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition-colors"
          >
            View all pools
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <LendTable pools={assets} isLoading={isLoading} error={error} />
    </div>
  );
};

export default AssetBreakdown;
