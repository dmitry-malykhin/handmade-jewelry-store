import { Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto'

const BCRYPT_SALT_ROUNDS = 12

/**
 * Order statuses that represent realised revenue — used when computing customer
 * lifetime value. PENDING is excluded (payment not confirmed); CANCELLED /
 * REFUNDED are excluded (no net income). PARTIALLY_REFUNDED stays in so the
 * non-refunded slice still counts (refundAmount is subtracted downstream).
 */
const REVENUE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.PARTIALLY_REFUNDED,
]

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } })
  }

  async findById(userId: string) {
    return this.prismaService.user.findUnique({ where: { id: userId } })
  }

  async createUser(email: string, plainPassword: string) {
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS)
    return this.prismaService.user.create({
      data: { email, password: hashedPassword, role: Role.USER },
    })
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  /**
   * Admin customers list — paginated, with computed totalOrders and
   * lifetimeValueUsd per user. We only surface USER role (admins should not
   * appear in their own customer roster).
   *
   * Lifetime value is computed in JS after a single batched query rather than
   * via a SQL subquery — the customer roster is small (handmade store), and
   * keeping aggregation in code keeps the SQL portable across the dev SQLite
   * and prod Postgres options.
   */
  async findAllCustomers(adminCustomerQueryDto: AdminCustomerQueryDto) {
    const { page = 1, limit = 20, search } = adminCustomerQueryDto
    const skip = (page - 1) * limit

    const whereClause = {
      role: Role.USER,
      ...(search && {
        email: { contains: search, mode: 'insensitive' as const },
      }),
    }

    const [users, totalCount] = await Promise.all([
      this.prismaService.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          orders: {
            select: { status: true, total: true, refundAmount: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where: whereClause }),
    ])

    const data = users.map((user) => {
      const revenueOrders = user.orders.filter((order) =>
        REVENUE_ORDER_STATUSES.includes(order.status),
      )
      const lifetimeValueUsd = revenueOrders.reduce((sum, order) => {
        const refunded = order.refundAmount ? order.refundAmount.toNumber() : 0
        return sum + order.total.toNumber() - refunded
      }, 0)
      const lastOrderAt = user.orders
        .map((order) => order.createdAt.getTime())
        .reduce((latest, current) => (current > latest ? current : latest), 0)
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        totalOrders: user.orders.length,
        lifetimeValueUsd: Number(lifetimeValueUsd.toFixed(2)),
        lastOrderAt: lastOrderAt > 0 ? new Date(lastOrderAt) : null,
      }
    })

    return {
      data,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  /**
   * Detailed customer profile for `/admin/customers/[id]`. Returns full order
   * history (newest first) + saved addresses for support flows.
   */
  async findCustomerById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        addresses: { orderBy: { isDefault: 'desc' } },
      },
    })

    if (!user) {
      throw new NotFoundException(`Customer ${userId} not found`)
    }

    const revenueOrders = user.orders.filter((order) =>
      REVENUE_ORDER_STATUSES.includes(order.status),
    )
    const lifetimeValueUsd = Number(
      revenueOrders
        .reduce((sum, order) => {
          const refunded = order.refundAmount ? order.refundAmount.toNumber() : 0
          return sum + order.total.toNumber() - refunded
        }, 0)
        .toFixed(2),
    )

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      totalOrders: user.orders.length,
      lifetimeValueUsd,
      orders: user.orders,
      addresses: user.addresses,
    }
  }
}
