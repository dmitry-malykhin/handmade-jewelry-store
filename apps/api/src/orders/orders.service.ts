import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { Decimal, InputJsonValue } from '@prisma/client/runtime/library'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { RefundOrderDto } from './dto/refund-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly analyticsService: AnalyticsService,
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

      return transaction.order.update({
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
  async findAllRefunds() {
    return this.prismaService.order.findMany({
      where: {
        OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }],
      },
      orderBy: { refundedAt: 'desc' },
      include: {
        items: true,
        payment: true,
      },
    })
  }
}
