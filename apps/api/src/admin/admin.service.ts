import { Injectable } from '@nestjs/common'
import type {
  AdminStats,
  RevenueChartDataPoint,
  RevenueChartPeriod,
  RevenueStats,
} from '@jewelry/shared'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type { AdminStats }

// Statuses that represent real revenue (not cancelled or fully refunded)
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.PARTIALLY_REFUNDED,
]

function periodToStartDate(period: RevenueChartPeriod): Date {
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

function formatDate(date: Date): string {
  // Use local date components — toISOString() returns UTC and shifts day in non-UTC timezones
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildEmptyChartData(startDate: Date, period: RevenueChartPeriod): Map<string, number> {
  const map = new Map<string, number>()
  const now = new Date()

  // For 1y period, group by month (first day of each month)
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

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [productCount, orderCount, revenueResult] = await Promise.all([
      this.prismaService.product.count(),
      this.prismaService.order.count(),
      this.prismaService.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { total: true },
      }),
    ])

    const totalRevenueCents = Math.round(Number(revenueResult._sum.total ?? 0) * 100)

    return { productCount, orderCount, totalRevenueCents }
  }

  async getRevenueStats(period: RevenueChartPeriod): Promise<RevenueStats> {
    const startDate = periodToStartDate(period)

    const orders = await this.prismaService.order.findMany({
      where: {
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
    })

    const chartMap = buildEmptyChartData(startDate, period)

    let totalRevenueCents = 0

    for (const order of orders) {
      const orderRevenueCents = Math.round(Number(order.total) * 100)
      totalRevenueCents += orderRevenueCents

      if (period === '1y') {
        // Group by first day of the month
        const bucketDate = new Date(order.createdAt.getFullYear(), order.createdAt.getMonth(), 1)
        const bucketKey = formatDate(bucketDate)
        chartMap.set(bucketKey, (chartMap.get(bucketKey) ?? 0) + orderRevenueCents)
      } else {
        const bucketKey = formatDate(order.createdAt)
        chartMap.set(bucketKey, (chartMap.get(bucketKey) ?? 0) + orderRevenueCents)
      }
    }

    const chartData: RevenueChartDataPoint[] = Array.from(chartMap.entries()).map(
      ([date, revenueCents]) => ({ date, revenueCents }),
    )

    const orderCount = orders.length
    const avgOrderValueCents = orderCount > 0 ? Math.round(totalRevenueCents / orderCount) : 0

    return { totalRevenueCents, orderCount, avgOrderValueCents, chartData }
  }
}
