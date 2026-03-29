import { Injectable } from '@nestjs/common'
import type { AdminStats } from '@jewelry/shared'
import { PrismaService } from '../prisma/prisma.service'

export type { AdminStats }

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [productCount, orderCount] = await Promise.all([
      this.prismaService.product.count(),
      this.prismaService.order.count(),
    ])

    return { productCount, orderCount, totalRevenueCents: 0 }
  }
}
