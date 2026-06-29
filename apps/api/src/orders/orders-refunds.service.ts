import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { RefundOrderDto } from './dto/refund-order.dto'
import { RefundsQueryDto } from './dto/refunds-query.dto'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersRefundsService {
  private readonly logger = new Logger(OrdersRefundsService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly analyticsService: AnalyticsService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

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
}
