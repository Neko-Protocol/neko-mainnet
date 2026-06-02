"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/lib/services/audit.service";
import type { AuditLog } from "@/lib/types/audit.types";

export function useAuditLog(wallet?: string) {
  return useQuery<AuditLog[]>({
    queryKey: ["audit", wallet ?? "global"],
    queryFn: () => auditService.getActivity(wallet),
    enabled: wallet !== "",
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
