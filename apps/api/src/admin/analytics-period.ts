import type { RevenueChartPeriod } from '@jewelry/shared'
import { OrderStatus } from '@prisma/client'

// Excludes cancelled and fully refunded — only orders that produced real revenue.
export const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.PARTIALLY_REFUNDED,
]

export function periodToStartDate(period: RevenueChartPeriod): Date {
  const now = new Date()
  switch (period) {
    case '7d':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    case '30d':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    case '90d':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  }
}

// toISOString() returns UTC and shifts the day in non-UTC timezones.
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildEmptyChartData(
  startDate: Date,
  period: RevenueChartPeriod,
): Map<string, number> {
  const map = new Map<string, number>()
  const now = new Date()

  if (period === '1y') {
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (cursor <= now) {
      map.set(formatDate(cursor), 0)
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    const cursor = new Date(startDate)
    while (cursor <= now) {
      map.set(formatDate(cursor), 0)
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return map
}
