import { Injectable } from '@nestjs/common'
import type {
  KeyMetrics,
  RevenueChartDataPoint,
  RevenueChartPeriod,
  RevenueStats,
} from '@jewelry/shared'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  REVENUE_STATUSES,
  buildEmptyChartData,
  formatDate,
  periodToStartDate,
} from './analytics-period'

@Injectable()
export class AdminRevenueService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async getKeyMetrics(period: RevenueChartPeriod): Promise<KeyMetrics> {
    const startDate = periodToStartDate(period)

    const ordersInPeriod = await this.prismaService.order.findMany({
      where: {
        status: { in: REVENUE_STATUSES.concat([OrderStatus.REFUNDED, OrderStatus.CANCELLED]) },
        createdAt: { gte: startDate },
      },
      select: { id: true, userId: true, status: true, createdAt: true, deliveredAt: true },
    })

    const paidOrders = ordersInPeriod.filter((order) => REVENUE_STATUSES.includes(order.status))
    const refundedOrders = ordersInPeriod.filter((order) => order.status === OrderStatus.REFUNDED)

    const refundRatePercent =
      paidOrders.length === 0 ? 0 : Math.round((refundedOrders.length / paidOrders.length) * 100)

    // Cohort split: each customer's first-ever paid order — inside window = new.
    const uniqueUserIds = Array.from(
      new Set(
        paidOrders
          .map((order) => order.userId)
          .filter((userId): userId is string => userId !== null),
      ),
    )

    let newCustomers = 0
    let returningCustomers = 0
    if (uniqueUserIds.length > 0) {
      const firstOrderByUser = await this.prismaService.order.groupBy({
        by: ['userId'],
        where: { userId: { in: uniqueUserIds }, status: { in: REVENUE_STATUSES } },
        _min: { createdAt: true },
      })
      for (const aggregate of firstOrderByUser) {
        const firstOrderAt = aggregate._min.createdAt
        if (!firstOrderAt) continue
        if (firstOrderAt >= startDate) newCustomers += 1
        else returningCustomers += 1
      }
    }

    // Mean of (deliveredAt − createdAt), days rounded, for orders that both
    // started AND completed inside the period.
    const deliveredInPeriod = paidOrders.filter(
      (order) => order.status === OrderStatus.DELIVERED && order.deliveredAt !== null,
    )
    let avgDaysOrderToDelivery = 0
    if (deliveredInPeriod.length > 0) {
      const totalMs = deliveredInPeriod.reduce((sum, order) => {
        const deliveredAt = order.deliveredAt as Date
        return sum + (deliveredAt.getTime() - order.createdAt.getTime())
      }, 0)
      const meanMs = totalMs / deliveredInPeriod.length
      avgDaysOrderToDelivery = Math.round(meanMs / (1000 * 60 * 60 * 24))
    }

    return { newCustomers, returningCustomers, refundRatePercent, avgDaysOrderToDelivery }
  }
}
