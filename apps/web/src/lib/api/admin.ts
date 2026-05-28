import type {
  AdminStats,
  KeyMetrics,
  OrderStatusBreakdownRow,
  RevenueChartPeriod,
  RevenueStats,
  TopProductRow,
} from '@jewelry/shared'
import { apiClient } from './client'

export type {
  AdminStats,
  KeyMetrics,
  OrderStatusBreakdownRow,
  RevenueChartPeriod,
  RevenueStats,
  TopProductRow,
}

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

export async function fetchAdminTopProducts(
  period: RevenueChartPeriod,
  limit: number,
  accessToken: string,
): Promise<TopProductRow[]> {
  return apiClient<TopProductRow[]>(
    `/api/admin/analytics/products/top?period=${period}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
}

export async function fetchAdminOrderStatusBreakdown(
  period: RevenueChartPeriod,
  accessToken: string,
): Promise<OrderStatusBreakdownRow[]> {
  return apiClient<OrderStatusBreakdownRow[]>(
    `/api/admin/analytics/orders/status-breakdown?period=${period}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
}

export async function fetchAdminKeyMetrics(
  period: RevenueChartPeriod,
  accessToken: string,
): Promise<KeyMetrics> {
  return apiClient<KeyMetrics>(`/api/admin/analytics/key-metrics?period=${period}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
