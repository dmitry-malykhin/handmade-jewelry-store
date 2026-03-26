import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, shippingAddress, userId, guestEmail, subtotal, shippingCost, total, source } =
      createOrderDto

    const order = await this.prismaService.order.create({
      data: {
        userId: userId ?? null,
        guestEmail: guestEmail ?? null,
        subtotal,
        shippingCost,
        total,
        shippingAddress: shippingAddress as unknown as InputJsonValue,
        source: source ?? 'web',
        status: OrderStatus.PENDING,
        items: {
          create: items.map((orderItem) => ({
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            price: orderItem.price,
            productSnapshot: orderItem.productSnapshot,
          })),
        },
        // Record initial PENDING status in history for full audit trail
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: OrderStatus.PENDING,
            createdBy: userId ?? guestEmail ?? 'guest',
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    })

    return order
  }

  async findAll(orderQueryDto: OrderQueryDto) {
    const { page = 1, limit = 20, status, userId } = orderQueryDto
    const skip = (page - 1) * limit

    const whereClause = {
      ...(status && { status }),
      ...(userId && { userId }),
    }

    const [orders, totalCount] = await Promise.all([
      this.prismaService.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.order.count({ where: whereClause }),
    ])

    return {
      data: orders,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
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

  async updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOneById(orderId)

    if (!isValidOrderStatusTransition(order.status, updateOrderStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${updateOrderStatusDto.status}`,
      )
    }

    const updatedOrder = await this.prismaService.order.update({
      where: { id: orderId },
      data: {
        status: updateOrderStatusDto.status,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: updateOrderStatusDto.status,
            note: updateOrderStatusDto.note,
            createdBy: 'admin',
          },
        },
      },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })

    return updatedOrder
  }
}
