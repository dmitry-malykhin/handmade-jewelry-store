import { Injectable } from '@nestjs/common'
import type {
  OrderStatusBreakdownRow,
  OrderStatusForBreakdown,
  RevenueChartPeriod,
} from '@jewelry/shared'
import { PrismaService } from '../prisma/prisma.service'
import { periodToStartDate } from './analytics-period'

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

@Injectable()
export class AdminOrdersAnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  // Includes zero-count statuses so a fresh period renders the full legend
  // instead of a single slice.
  async getOrderStatusBreakdown(period: RevenueChartPeriod): Promise<OrderStatusBreakdownRow[]> {
    const startDate = periodToStartDate(period)

    const aggregates = await this.prismaService.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { status: true },
    })

    const countByStatus = new Map(aggregates.map((row) => [row.status, row._count.status]))
    return ALL_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }))
  }
}
