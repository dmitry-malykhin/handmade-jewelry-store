import type { AdminStats, RevenueChartPeriod, RevenueStats } from '@jewelry/shared'
import { apiClient } from './client'

export type { AdminStats, RevenueChartPeriod, RevenueStats }

export async function fetchAdminStats(accessToken: string): Promise<AdminStats> {
  return apiClient<AdminStats>('/api/admin/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function fetchAdminRevenueStats(
  period: RevenueChartPeriod,
  accessToken: string,
): Promise<RevenueStats> {
  return apiClient<RevenueStats>(`/api/admin/stats/revenue?period=${period}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
