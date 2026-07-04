import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrderStatus, Prisma } from '@prisma/client'
import * as Sentry from '@sentry/nestjs'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { buildCsvDocument } from '../common/csv/csv-formatter'
import { paginate } from '../common/pagination/paginate'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderExportQueryDto } from './dto/order-export-query.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { isValidOrderStatusTransition } from './order-status.transitions'

const ORDER_EXPORT_HEADERS = [
  'order_id',
  'date',
  'customer_email',
  'customer_name',
  'shipping_address',
  'items',
  'subtotal',
  'shipping',
  'total',
  'status',
  'tracking_number',
] as const

interface ShippingAddressSnapshot {
  fullName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

function formatShippingAddress(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') return ''
  const address = snapshot as ShippingAddressSnapshot
  const streetLines = [address.addressLine1, address.addressLine2].filter(Boolean).join(' ')
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(' ')
  return [streetLines, cityLine, address.country].filter(Boolean).join(', ')
}

interface OrderItemForExport {
  productSnapshot: unknown
  quantity: number
}

// Renders as `"Title × 2 | Title × 1"` — a single readable CSV cell.
function formatOrderItems(items: readonly OrderItemForExport[]): string {
  return items
    .map((item) => {
      const snapshot = item.productSnapshot
      const title =
        snapshot && typeof snapshot === 'object' && 'title' in snapshot
          ? String((snapshot as { title: unknown }).title)
          : '(deleted product)'
      return `${title} × ${item.quantity}`
    })
    .join(' | ')
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const {
      items,
      shippingAddress,
      userId,
      guestEmail,
      subtotal,
      shippingCost,
      total,
      loyaltyPointsToRedeem,
      source,
    } = createOrderDto

    // Re-verify the client's loyaltyPointsToRedeem against the real balance
    // and the per-order cap (50% of subtotal); recalculate `total` server-side.
    let pointsToRedeem = 0
    let adjustedTotal = total
    if (userId && loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
      const { balance } = await this.loyaltyService.getBalance(userId)
      const maxRedeemable = Math.floor(subtotal * 100 * 0.5)
      pointsToRedeem = Math.min(loyaltyPointsToRedeem, balance, maxRedeemable)
      if (pointsToRedeem > 0) {
        const redemptionUsd = pointsToRedeem / 100
        adjustedTotal = Math.max(0, Number((total - redemptionUsd).toFixed(2)))
      }
    }

    try {
      const order = await this.prismaService.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: userId ?? null,
            guestEmail: guestEmail ?? null,
            subtotal,
            shippingCost,
            total: adjustedTotal,
            loyaltyPointsUsed: pointsToRedeem,
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

        if (pointsToRedeem > 0 && userId) {
          await this.loyaltyService.spendForCheckout(tx, {
            userId,
            orderId: created.id,
            points: pointsToRedeem,
          })
        }

        return created
      })

      return order
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const field = error.meta?.field_name ?? 'unknown field'
          this.logger.warn(`Order creation failed — foreign key constraint on ${field}`)
          throw new BadRequestException(
            `One or more items reference a product that does not exist (${field})`,
          )
        }
        if (error.code === 'P2025') {
          throw new BadRequestException('One or more referenced records do not exist')
        }
      }
      throw error
    }
  }

  // Returns the whole filtered set as a single CSV string — admins clicking
  // Export expect the full result. Newest first so the relevant rows lead.
  async exportToCsv(query: OrderExportQueryDto): Promise<string> {
    const { status, from, to } = query

    const whereClause: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    }

    const orders = await this.prismaService.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const rows = orders.map((order) => {
      const shippingAddress = formatShippingAddress(order.shippingAddress)
      const customerName = (order.shippingAddress as ShippingAddressSnapshot | null)?.fullName ?? ''
      return [
        order.id,
        order.createdAt.toISOString(),
        order.guestEmail ?? order.userId ?? '',
        customerName,
        shippingAddress,
        formatOrderItems(order.items),
        order.subtotal.toFixed(2),
        order.shippingCost.toFixed(2),
        order.total.toFixed(2),
        order.status,
        order.trackingNumber ?? '',
      ]
    })

    return buildCsvDocument(ORDER_EXPORT_HEADERS, rows)
  }

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

  async updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOneById(orderId)

    Sentry.setContext('order', {
      orderId,
      fromStatus: order.status,
      toStatus: updateOrderStatusDto.status,
    })
    Sentry.addBreadcrumb({
      category: 'orders.status',
      message: `updateStatus ${orderId} ${order.status} → ${updateOrderStatusDto.status}`,
      level: 'info',
      data: { orderId, fromStatus: order.status, toStatus: updateOrderStatusDto.status },
    })

    if (!isValidOrderStatusTransition(order.status, updateOrderStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${updateOrderStatusDto.status}`,
      )
    }

    // Atomic with loyalty bookkeeping — a DELIVERED that didn't credit points
    // would show inconsistent state on the account page until fixed by hand.
    const updatedOrder = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
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

      // Both loyalty helpers are idempotent — they bail when there's nothing
      // to do (guest order, points already awarded, etc.).
      if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
        await this.loyaltyService.awardForDelivered(tx, next)
      }
      if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
        await this.loyaltyService.reverseForCancellationOrRefund(tx, next)
      }

      return next
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

  async updateTracking(orderId: string, updateOrderTrackingDto: UpdateOrderTrackingDto) {
    await this.findOneById(orderId)

    return this.prismaService.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: updateOrderTrackingDto.trackingNumber,
        shippingCarrier: updateOrderTrackingDto.shippingCarrier,
        shippedAt: new Date(),
      },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })
  }
}
