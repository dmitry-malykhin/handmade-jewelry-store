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

/** Renders the ShippingAddress JSON snapshot into a single CSV cell. */
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

/** Compacts the line items into a single readable cell — "Title × 2 | Title × 1". */
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

    // ── Loyalty redemption: server-side validation + total adjustment ──────
    // The client sends a candidate `loyaltyPointsToRedeem`; we re-verify
    // against the actual balance and the per-order cap (50% of subtotal) and
    // recalculate `total` on the server. Anything the client sent in `total`
    // for the discounted amount is overwritten by our calculation.
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

  /**
   * Builds a CSV document of every order matching the optional status / date
   * filters. Returned as a single string so the controller can stream it to
   * the client with the right `Content-Type` and `Content-Disposition`.
   *
   * No pagination here on purpose — an admin invoking "Export" expects the
   * full result set. We cap exposure by sorting `createdAt desc` so even if
   * the catalogue ever grows huge the most relevant rows arrive first.
   */
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

    // Wrap status update + loyalty bookkeeping in one transaction. Either both
    // commit or neither does — a half-finished DELIVERED transition that
    // didn't credit points would be visible (and confusing) on the account
    // page until manually fixed.
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

      // Loyalty hooks — only the transitions that actually move points fire
      // here. Both helpers are idempotent and bail when there's nothing to do
      // (guest order, points already awarded, etc.).
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
        // Record exact time admin added tracking — used for delivery estimate display
        shippedAt: new Date(),
      },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })
  }

  /**
   * Issues a full or partial refund against the order's Stripe PaymentIntent.
   *
   * Order is the source of truth for refund metadata (reason, note) — the Stripe
   * webhook `charge.refunded` will arrive later but the idempotency guard
   * (payment.status already REFUNDED / PARTIALLY_REFUNDED) makes it a no-op.
   *
   * Validation:
   *  - Order must have a Payment in SUCCEEDED or PARTIALLY_REFUNDED status
   *  - Requested amount cannot exceed remaining refundable (total − refundAmount)
   *  - Status transition to REFUNDED / PARTIALLY_REFUNDED must be allowed
   *
   * Side effects (all in a single transaction):
   *  - Stripe Refund created (outside transaction; if it succeeds and DB writes
   *    fail, the webhook will reconcile on retry)
   *  - Payment.status → REFUNDED (full) or PARTIALLY_REFUNDED (partial)
   *  - Order.status, refundedAt, refundAmount (cumulative), refundReason, refundNote
   *  - OrderStatusHistory entry
   *  - Refund confirmation email sent (best-effort; failure does not roll back)
   */
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

    // Stripe refund happens outside the DB transaction. If Stripe succeeds but
    // DB write fails, the webhook handler will reconcile (idempotent).
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

    // Capture the payment narrowing — TypeScript loses it inside the async
    // transaction callback closure, which is why we previously needed `!`.
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

      // Reverse any loyalty points earned at DELIVERED. Symmetric to the
      // award path — same transaction so balance stays consistent with the
      // payment + order state.
      await this.loyaltyService.reverseForCancellationOrRefund(transaction, next)

      return next
    })

    this.logger.log(
      `Order ${orderId} refunded $${requestedAmount} (cumulative $${cumulativeRefunded}, ${newOrderStatus})`,
    )

    // PostHog refund event — fires AFTER DB commit so a failed transaction
    // doesn't pollute the funnel. DistinctId matches trackPaymentSucceeded
    // so PostHog threads the refund into the same customer profile.
    const distinctId = updatedOrder.userId ?? updatedOrder.guestEmail ?? `order-${orderId}`
    this.analyticsService.trackOrderRefunded(distinctId, {
      orderId,
      refundAmountUsd: requestedAmount.toNumber(),
      reason: refundOrderDto.reason,
      isFullRefund,
    })

    // Refund confirmation email — best-effort, do not roll back the refund.
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

  /**
   * Lists all orders that have a refund recorded — both fully and partially
   * refunded. Used by the admin refunds page; orders without `refundedAt` are
   * excluded so the result is a pure refund ledger.
   */
  async findAllRefunds(query: RefundsQueryDto = {}) {
    const { from, to, reason, customer } = query

    // Customer substring matches either guest email OR the linked user's email.
    // Wrapping in a nested OR keeps it composable with the AND of other filters.
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

  /**
   * Production queue for the admin tracker — orders that have at least one
   * MADE_TO_ORDER item and haven't shipped yet (status PAID or PROCESSING).
   * Each row is enriched with:
   *   - `productionDeadlineAt` = order.createdAt + max(productionDays) across
   *     MADE_TO_ORDER items. A single deadline per order keeps the table
   *     scan-able even when an order mixes multiple MTO pieces.
   *   - `maxProductionDays` — surfaced so the UI can show "X day window" too.
   *
   * Sorted by deadline ASC so the most urgent piece is first.
   */
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

  /**
   * Sets the production status / notes for an order. Validates the new status
   * against a tight whitelist — the production flow is QUEUED → IN_PRODUCTION
   * → READY_TO_SHIP. Skipping back (e.g. READY_TO_SHIP → QUEUED) is forbidden
   * to prevent accidental clobbering; admins who really need to reset can
   * change it directly in the DB.
   */
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

/**
 * Production status transitions. Linear flow — admins move forward through
 * QUEUED → IN_PRODUCTION → READY_TO_SHIP. Same-state writes are allowed so
 * "update note without changing status" works.
 */
function isValidProductionStatusTransition(
  fromStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
  toStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
): boolean {
  if (fromStatus === toStatus) return true
  if (fromStatus === 'QUEUED' && toStatus === 'IN_PRODUCTION') return true
  if (fromStatus === 'IN_PRODUCTION' && toStatus === 'READY_TO_SHIP') return true
  // Allow direct QUEUED → READY_TO_SHIP for trivial pieces the maker finished
  // immediately (e.g. ready stock that was mis-classified MTO).
  if (fromStatus === 'QUEUED' && toStatus === 'READY_TO_SHIP') return true
  return false
}
