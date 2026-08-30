"use server";

import { fetchFromBackend } from "@/lib/services/backend-client";
import type { RpcOverview } from "./types";

export async function fetchRpcOverview(): Promise<RpcOverview> {
  return fetchFromBackend<RpcOverview>("admin-analytics/rpc");
}
