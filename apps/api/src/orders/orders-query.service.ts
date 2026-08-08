import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Role, type User } from '@prisma/client'
import { paginate } from '../common/pagination/paginate'
import { PrismaService } from '../prisma/prisma.service'
import { OrderQueryDto } from './dto/order-query.dto'

@Injectable()
export class OrdersQueryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(orderQueryDto: OrderQueryDto) {
    const { page, limit, status, userId } = orderQueryDto

    const whereClause = {
      ...(status && { status }),
      ...(userId && { userId }),
    }

    return paginate(
      { page, limit },
      (skip, take) =>
        this.prismaService.order.findMany({
          where: whereClause,
          skip,
          take,
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
      () => this.prismaService.order.count({ where: whereClause }),
    )
  }

  async findUserOrders(userId: string) {
    return this.prismaService.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOneById(orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`)
    }

    return order
  }

  // Called by GET /orders/:id. Fetches the order and rejects unless the caller
  // is the owner, is an admin, or presented a valid order-access token issued
  // at creation. Prevents the pre-#392 IDOR where any UUID leaked full PII.
  async findOneByIdForCaller(
    orderId: string,
    caller: User | null,
    orderAccessToken: string | null,
  ) {
    const order = await this.findOneById(orderId)

    if (caller) {
      if (caller.role === Role.ADMIN || order.userId === caller.id) return order
      throw new ForbiddenException('You do not have access to this order')
    }

    if (!orderAccessToken) {
      throw new UnauthorizedException('Authentication required to view this order')
    }

    let payload: { orderId?: string; purpose?: string }
    try {
      payload = this.jwtService.verify(orderAccessToken)
    } catch {
      throw new UnauthorizedException('Invalid or expired order access token')
    }

    if (payload.purpose !== 'order-access' || payload.orderId !== orderId) {
      throw new UnauthorizedException('Order access token does not match this order')
    }

    return order
  }
}
