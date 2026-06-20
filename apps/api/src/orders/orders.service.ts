import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus, Prisma, StockType } from '@prisma/client'
import { Decimal, InputJsonValue } from '@prisma/client/runtime/library'
import { AnalyticsService } from '../analytics/analytics.service'
import { buildCsvDocument } from '../common/csv/csv-formatter'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderExportQueryDto } from './dto/order-export-query.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { RefundOrderDto } from './dto/refund-order.dto'
import { RefundsQueryDto } from './dto/refunds-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { UpdateProductionDto } from './dto/update-production.dto'
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
    private readonly stripeService: StripeService,
    private readonly analyticsService: AnalyticsService,
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

  // Order is the source of truth for refund metadata — the late-arriving
  // `charge.refunded` webhook is idempotent because payment.status is already
  // REFUNDED / PARTIALLY_REFUNDED by the time it fires.
  async refundOrder(orderId: string, refundOrderDto: RefundOrderDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }
    if (!order.payment) {
      throw new BadRequestException(`Order ${orderId} has no payment to refund`)
    }
    if (
      order.payment.status !== PaymentStatus.SUCCEEDED &&
      order.payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Order ${orderId} payment status is ${order.payment.status} — cannot refund`,
      )
    }

    const alreadyRefunded = order.refundAmount ?? new Decimal(0)
    const remainingRefundable = order.total.minus(alreadyRefunded)
    const requestedAmount = refundOrderDto.amount
      ? new Decimal(refundOrderDto.amount)
      : remainingRefundable

    if (requestedAmount.greaterThan(remainingRefundable)) {
      throw new BadRequestException(
        `Refund amount $${requestedAmount} exceeds remaining refundable $${remainingRefundable}`,
      )
    }
    if (requestedAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Refund amount must be greater than zero')
    }

    // Stripe is called outside the DB transaction; if Stripe succeeds but the
    // DB write fails, the webhook reconciles on retry.
    const stripeRefund = await this.stripeService.createRefund(
      order.payment.stripeId,
      requestedAmount.toNumber(),
    )

    const cumulativeRefunded = alreadyRefunded.plus(requestedAmount)
    const isFullRefund = cumulativeRefunded.greaterThanOrEqualTo(order.total)
    const newOrderStatus = isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED
    const newPaymentStatus = isFullRefund
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED

    if (!isValidOrderStatusTransition(order.status, newOrderStatus)) {
      throw new BadRequestException(
        `Order ${orderId} cannot transition from ${order.status} to ${newOrderStatus}`,
      )
    }

    // TS narrowing is lost inside the async transaction callback.
    const payment = order.payment

    const updatedOrder = await this.prismaService.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: newPaymentStatus },
      })

      const next = await transaction.order.update({
        where: { id: orderId },
        data: {
          status: newOrderStatus,
          refundedAt: new Date(),
          refundAmount: cumulativeRefunded,
          refundReason: refundOrderDto.reason,
          refundNote: refundOrderDto.note ?? null,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: newOrderStatus,
              note: `Refund $${requestedAmount} — ${refundOrderDto.reason}${
                refundOrderDto.note ? ` — ${refundOrderDto.note}` : ''
              } (Stripe refund ${stripeRefund.id})`,
              createdBy: 'admin',
            },
          },
        },
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      })

      await this.loyaltyService.reverseForCancellationOrRefund(transaction, next)

      return next
    })

    this.logger.log(
      `Order ${orderId} refunded $${requestedAmount} (cumulative $${cumulativeRefunded}, ${newOrderStatus})`,
    )

    // Fires AFTER commit so a rolled-back transaction can't pollute the funnel;
    // distinctId matches trackPaymentSucceeded so the refund threads on the
    // same PostHog profile.
    const distinctId = updatedOrder.userId ?? updatedOrder.guestEmail ?? `order-${orderId}`
    this.analyticsService.trackOrderRefunded(distinctId, {
      orderId,
      refundAmountUsd: requestedAmount.toNumber(),
      reason: refundOrderDto.reason,
      isFullRefund,
    })

    // Best-effort — an email failure must not roll back the refund itself.
    const recipientEmail = updatedOrder.guestEmail ?? null
    if (recipientEmail) {
      try {
        await this.emailService.sendRefundProcessed({
          recipientEmail,
          orderId,
          refundAmount: requestedAmount.toNumber(),
        })
      } catch (error) {
        this.logger.error(
          `Refund email failed for order ${orderId} — refund itself succeeded`,
          error instanceof Error ? error.stack : undefined,
        )
      }
    }

    return updatedOrder
  }

  // Pure refund ledger — orders without `refundedAt` are excluded.
  async findAllRefunds(query: RefundsQueryDto = {}) {
    const { from, to, reason, customer } = query

    // Match guest email OR the linked user's email — nested OR so the AND of
    // other filters composes correctly.
    const customerClause: Prisma.OrderWhereInput | undefined = customer
      ? {
          OR: [
            { guestEmail: { contains: customer, mode: 'insensitive' as const } },
            { user: { email: { contains: customer, mode: 'insensitive' as const } } },
          ],
        }
      : undefined

    const whereClause: Prisma.OrderWhereInput = {
      AND: [
        { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
        ...(from || to
          ? [
              {
                refundedAt: {
                  ...(from && { gte: new Date(from) }),
                  ...(to && { lte: new Date(to) }),
                },
              },
            ]
          : []),
        ...(reason ? [{ refundReason: reason }] : []),
        ...(customerClause ? [customerClause] : []),
      ],
    }

    return this.prismaService.order.findMany({
      where: whereClause,
      orderBy: { refundedAt: 'desc' },
      include: {
        items: true,
        payment: true,
      },
    })
  }

  // Orders with at least one MADE_TO_ORDER item that haven't shipped yet,
  // enriched with a single deadline per order so the table stays scan-able.
  async findProductionQueue() {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
        items: {
          some: { product: { stockType: StockType.MADE_TO_ORDER } },
        },
      },
      include: {
        items: { include: { product: { select: { stockType: true, productionDays: true } } } },
      },
    })

    const enriched = orders.map((order) => {
      const mtoProductionDays = order.items
        .filter((item) => item.product?.stockType === StockType.MADE_TO_ORDER)
        .map((item) => item.product?.productionDays ?? 0)
      const maxProductionDays = mtoProductionDays.length > 0 ? Math.max(...mtoProductionDays) : 0
      const deadline = new Date(order.createdAt)
      deadline.setDate(deadline.getDate() + maxProductionDays)
      return {
        ...order,
        maxProductionDays,
        productionDeadlineAt: deadline.toISOString(),
      }
    })

    enriched.sort(
      (a, b) =>
        new Date(a.productionDeadlineAt).getTime() - new Date(b.productionDeadlineAt).getTime(),
    )

    return enriched
  }

  // Production flow is forward-only: QUEUED → IN_PRODUCTION → READY_TO_SHIP.
  // Reverse transitions are blocked to prevent accidental clobbering;
  // resetting requires direct DB access.
  async updateProduction(orderId: string, updateProductionDto: UpdateProductionDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      select: { id: true, productionStatus: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    if (
      !isValidProductionStatusTransition(
        order.productionStatus,
        updateProductionDto.productionStatus,
      )
    ) {
      throw new BadRequestException(
        `Order ${orderId} cannot transition production status from ${order.productionStatus} to ${updateProductionDto.productionStatus}`,
      )
    }

    return this.prismaService.order.update({
      where: { id: orderId },
      data: {
        productionStatus: updateProductionDto.productionStatus,
        productionNotes: updateProductionDto.productionNotes ?? null,
      },
      include: {
        items: { include: { product: { select: { stockType: true, productionDays: true } } } },
      },
    })
  }
}

// Same-state writes are allowed so "update note without changing status" works.
function isValidProductionStatusTransition(
  fromStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
  toStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
): boolean {
  if (fromStatus === toStatus) return true
  if (fromStatus === 'QUEUED' && toStatus === 'IN_PRODUCTION') return true
  if (fromStatus === 'IN_PRODUCTION' && toStatus === 'READY_TO_SHIP') return true
  // Direct skip for trivial pieces (e.g. ready stock mis-classified MTO).
  if (fromStatus === 'QUEUED' && toStatus === 'READY_TO_SHIP') return true
  return false
}
