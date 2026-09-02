"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/FormControls";
import {
  useReferredByPartner,
  useReferredByWallet,
} from "../hooks/useReferredBreakdown";
import { ReferredBreakdownTable } from "./ReferredBreakdownTable";

export interface ReferredBreakdownSectionProps {
  kind: "wallet" | "partner";
  id: string;
  /** Display label for the title, e.g. a partner's name or a truncated
   * wallet — falls back to the raw id when not provided (a direct visit
   * or refresh, without the leaderboard row's context). */
  label?: string;
}

/** Per-wallet volume breakdown for a single referrer (wallet or partner),
 * reached by clicking their row on the leaderboard. */
export function ReferredBreakdownSection({
  kind,
  id,
  label,
}: ReferredBreakdownSectionProps) {
  const walletQuery = useReferredByWallet(kind === "wallet" ? id : "");
  const partnerQuery = useReferredByPartner(kind === "partner" ? id : "");
  const { data, isPending, isError } =
    kind === "wallet" ? walletQuery : partnerQuery;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/referrals"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to referrals
      </Link>

      <Card
        title={`Referred by ${label ?? id}`}
        description="Every wallet this referrer brought in, ranked by volume generated."
      >
        <ReferredBreakdownTable
          rows={data}
          isPending={isPending}
          isError={isError}
        />
      </Card>
    </div>
  );
}
