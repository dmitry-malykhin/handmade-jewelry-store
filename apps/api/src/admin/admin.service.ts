import { Injectable } from '@nestjs/common'
import type { AdminStats } from '@jewelry/shared'
import { PrismaService } from '../prisma/prisma.service'
import { REVENUE_STATUSES } from './analytics-period'

export type { AdminStats }

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
}
