"use server";

import { backendGet } from "./backend";
import type { SegmentId } from "./segments";

export async function getSegmentCount(segment: SegmentId): Promise<number> {
  const res = await backendGet<{ count: number }>(
    `v1/admin/segments/${encodeURIComponent(segment)}/count`
  );
  return res.count;
}
