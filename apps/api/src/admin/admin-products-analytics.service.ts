import { Injectable } from '@nestjs/common'
import type { RevenueChartPeriod, TopProductRow } from '@jewelry/shared'
import { PrismaService } from '../prisma/prisma.service'
import { REVENUE_STATUSES, periodToStartDate } from './analytics-period'

@Injectable()
export class AdminProductsAnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTopProducts(period: RevenueChartPeriod, limit = 10): Promise<TopProductRow[]> {
    const startDate = periodToStartDate(period)

    // groupBy + manual Product join keeps avgRating/images/slug available
    // without loading every OrderItem row.
    const aggregates = await this.prismaService.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: startDate },
        },
      },
      _sum: { quantity: true },
      // Prisma groupBy doesn't support SUM(price * quantity); computed below.
    })

    if (aggregates.length === 0) return []

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
}
