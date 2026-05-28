import { Injectable } from '@nestjs/common'
import type {
  AdminStats,
  KeyMetrics,
  OrderStatusBreakdownRow,
  OrderStatusForBreakdown,
  RevenueChartDataPoint,
  RevenueChartPeriod,
  RevenueStats,
  TopProductRow,
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

  /**
   * Top products ranked by revenue across orders that actually generated
   * cash (REVENUE_STATUSES). Aggregates at the OrderItem level so a product
   * sold twice on one order counts as two units. Returned slice is
   * `limit`-truncated; caller picks page size (10 by default on the UI).
   */
  async getTopProducts(period: RevenueChartPeriod, limit = 10): Promise<TopProductRow[]> {
    const startDate = periodToStartDate(period)

    // Aggregate units + revenue at the item level. Using a groupBy + manual
    // join with Product lets us include avgRating / images / slug without
    // loading every OrderItem row into memory.
    const aggregates = await this.prismaService.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: startDate },
        },
      },
      _sum: { quantity: true },
      // Sum (price * quantity) requires a raw expression — Prisma groupBy
      // doesn't support it directly, so we compute revenue from raw rows
      // post-aggregation.
    })

    if (aggregates.length === 0) return []

    // Pull raw item rows once per productId set so we can compute
    // revenue = SUM(price * quantity). Cheaper than per-product queries.
    const productIds = aggregates
      .map((row) => row.productId)
      .filter((id): id is string => id !== null)
    const items = await this.prismaService.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: startDate },
        },
      },
      select: { productId: true, price: true, quantity: true },
    })

    const revenueByProductCents = new Map<string, number>()
    for (const item of items) {
      if (!item.productId) continue
      const itemRevenueCents = Math.round(Number(item.price) * item.quantity * 100)
      revenueByProductCents.set(
        item.productId,
        (revenueByProductCents.get(item.productId) ?? 0) + itemRevenueCents,
      )
    }

    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        images: true,
        avgRating: true,
        reviewCount: true,
      },
    })
    const productById = new Map(products.map((product) => [product.id, product]))

    const rows: TopProductRow[] = []
    for (const aggregate of aggregates) {
      if (!aggregate.productId) continue
      const product = productById.get(aggregate.productId)
      if (!product) continue
      rows.push({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.images[0] ?? null,
        unitsSold: aggregate._sum.quantity ?? 0,
        revenueCents: revenueByProductCents.get(aggregate.productId) ?? 0,
        avgRating: product.avgRating,
        reviewCount: product.reviewCount,
      })
    }

    return rows.sort((a, b) => b.revenueCents - a.revenueCents).slice(0, limit)
  }

  /**
   * Donut-chart breakdown of every order status inside the period. Includes
   * statuses with zero orders too — keeps the chart visually stable so a
   * fresh period shows the full legend rather than a single slice.
   */
  async getOrderStatusBreakdown(period: RevenueChartPeriod): Promise<OrderStatusBreakdownRow[]> {
    const startDate = periodToStartDate(period)

    const aggregates = await this.prismaService.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { status: true },
    })

    const countByStatus = new Map(aggregates.map((row) => [row.status, row._count.status]))
    const ALL_STATUSES: OrderStatusForBreakdown[] = [
      'PENDING',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ]
    return ALL_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }))
  }

  /**
   * Customer + ops topline KPIs for the period. Computed in a single Prisma
   * round-trip where possible — these are exposed on every visit to
   * /admin/analytics so we keep the work cheap.
   */
  async getKeyMetrics(period: RevenueChartPeriod): Promise<KeyMetrics> {
    const startDate = periodToStartDate(period)

    // Paid orders in window — base set for refund-rate and customer cohorts.
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

    // Customer cohorts: identify each customer's first-ever paid order and
    // bucket by whether that first order falls inside our window.
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

    // Delivery duration: mean of (deliveredAt − createdAt) for orders that
    // both started AND completed inside the period. Days, rounded.
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
