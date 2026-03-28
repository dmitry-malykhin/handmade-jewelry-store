import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrderStatus, Prisma } from '@prisma/client'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, shippingAddress, userId, guestEmail, subtotal, shippingCost, total, source } =
      createOrderDto

    try {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003 = Foreign key constraint failed (e.g. productId does not exist)
        if (error.code === 'P2003') {
          const field = error.meta?.field_name ?? 'unknown field'
          this.logger.warn(`Order creation failed — foreign key constraint on ${field}`)
          throw new BadRequestException(
            `One or more items reference a product that does not exist (${field})`,
          )
        }
        // P2025 = Record not found
        if (error.code === 'P2025') {
          throw new BadRequestException('One or more referenced records do not exist')
        }
      }
      throw error
    }
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

    if (updateOrderStatusDto.status === OrderStatus.SHIPPED) {
      const recipientEmail = updatedOrder.guestEmail
      if (recipientEmail) {
        await this.emailService.sendShippingNotification({
          recipientEmail,
          orderId: updatedOrder.id,
          trackingNumber: updateOrderStatusDto.trackingNumber,
        })
      }
    }

    return updatedOrder
  }
}
