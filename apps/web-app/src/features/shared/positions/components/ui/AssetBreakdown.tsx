"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDashboardPools } from "@/features/shared/positions/hooks/useDashboardPools";
import { LendTable } from "@/features/shared/lending/components/ui/LendTable";
import type { PoolData } from "@/features/shared/lending/types/lending";

const DASHBOARD_TOP_POOLS_LIMIT = 8;

const AssetBreakdown: React.FC = () => {
  const t = useTranslations("sharedPositions.assetBreakdown");
  const router = useRouter();
  const { assets, isLoading, error, refetch } = useDashboardPools();

  const handleAction = (_pool: PoolData) => router.push("/lending");

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          {t("title")}
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-sm">{t("subtitle")}</p>
          <Link
            href="/lending"
            className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition-colors"
          >
            {t("viewAllPools")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <LendTable
        pools={assets.slice(0, DASHBOARD_TOP_POOLS_LIMIT)}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />
    </div>
  );
};

export default AssetBreakdown;
