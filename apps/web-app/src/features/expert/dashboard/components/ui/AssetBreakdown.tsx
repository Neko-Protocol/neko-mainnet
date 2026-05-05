"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDashboardPools } from "@/features/expert/dashboard/hooks/useDashboardPools";
import { LendTable } from "@/features/shared/lending/components/ui/LendTable";
import type { PoolData } from "@/features/shared/lending/types/lending";

const DASHBOARD_TOP_POOLS_LIMIT = 8;

const AssetBreakdown: React.FC = () => {
  const router = useRouter();
  const { assets, isLoading, error } = useDashboardPools();

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
        <Link
          href="/lending"
          className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition-colors self-end"
        >
          View all pools
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <LendTable
        pools={assets.slice(0, DASHBOARD_TOP_POOLS_LIMIT)}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};

export default AssetBreakdown;
