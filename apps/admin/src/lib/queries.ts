"use server";

import { backendGet } from "./backend";
import type { AuditLog } from "@/types/audit";

const DASH = "v1/admin/dashboard";

export async function getOverviewStats(): Promise<{
  totalUsers: number;
  newUsersThisWeek: number;
  totalTransactions: number;
  totalVolumeUsd: number;
  activeWalletsThisWeek: number;
}> {
  return backendGet(`${DASH}/overview`);
}

export async function getDailyNewUsers(
  days = 30
): Promise<{ date: string; count: number }[]> {
  return backendGet(`${DASH}/daily-new-users?days=${days}`);
}

export async function getWalletProviderBreakdown(): Promise<
  { provider: string; count: number }[]
> {
  return backendGet(`${DASH}/wallet-providers`);
}

export async function getNetworkBreakdown(): Promise<
  { network: string; count: number }[]
> {
  return backendGet(`${DASH}/networks`);
}

export async function getCurrencyDistribution(): Promise<
  { currency: string; count: number }[]
> {
  return backendGet(`${DASH}/currencies`);
}

export async function getTransactionsByType(): Promise<
  { action_type: string; count: number }[]
> {
  return backendGet(`${DASH}/transactions-by-type`);
}

export async function getDailyTransactions(
  days = 30
): Promise<{ date: string; count: number }[]> {
  return backendGet(`${DASH}/daily-transactions?days=${days}`);
}

export async function getTopAssetsByVolume(
  limit = 10
): Promise<{ asset_key: string; total_volume: number; touch_count: number }[]> {
  return backendGet(`${DASH}/top-assets?limit=${limit}`);
}

export async function getRecentActivity(limit = 50): Promise<AuditLog[]> {
  return backendGet(`${DASH}/recent-activity?limit=${limit}`);
}

export async function getEmailVerificationStats(): Promise<{
  verifiedCount: number;
  totalCount: number;
}> {
  return backendGet(`${DASH}/email-verification-stats`);
}
