"use server";

import { fetchFromBackend } from "@/lib/services/backend-client";
import type { InfrastructureSnapshot } from "./types";

export async function fetchInfrastructure(): Promise<InfrastructureSnapshot> {
  return fetchFromBackend<InfrastructureSnapshot>(
    "admin-analytics/infrastructure"
  );
}
