import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { isValidOrderStatusTransition } from '../orders/order-status.transitions'
import { SlackNotifierService } from './slack-notifier.service'
import { StripeService } from './stripe.service'

@Injectable()
export class StripeWebhooksService {
  private readonly logger = new Logger(StripeWebhooksService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
    private readonly slackNotifierService: SlackNotifierService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.prismaService.payment.findUnique({
      where: { stripeId: paymentIntent.id },
      include: { order: true },
    })

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent ${paymentIntent.id} — skipping`)
      return
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      this.logger.log(`PaymentIntent ${paymentIntent.id} already processed — skipping`)
      return
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      })

      if (isValidOrderStatusTransition(payment.order.status, OrderStatus.PAID)) {
        await transaction.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
            statusHistory: {
              create: {
                fromStatus: payment.order.status,
                toStatus: OrderStatus.PAID,
                note: `Stripe PaymentIntent ${paymentIntent.id} succeeded`,
                createdBy: 'system',
              },
            },
          },
        })
      } else {
        this.logger.warn(
          `Order ${payment.orderId} cannot transition from ${payment.order.status} to PAID — status history not updated`,
        )
      }
    })

    this.logger.log(`Order ${payment.orderId} transitioned to PAID`)

    // The client `order_placed` event can be lost (tab close, network drop),
    // so this webhook is the source of truth for revenue.
    const distinctId =
      payment.order.userId ?? payment.order.guestEmail ?? `order-${payment.orderId}`
    const amountUsd = (paymentIntent.amount ?? 0) / 100
    const paymentMethod = paymentIntent.payment_method_types?.[0] ?? 'unknown'
    this.analyticsService.trackPaymentSucceeded(distinctId, {
      orderId: payment.orderId,
      amountUsd,
      paymentMethod,
    })

    await this.sendOrderConfirmationEmail(payment.orderId)
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.prismaService.payment.findUnique({
      where: { stripeId: paymentIntent.id },
      include: { order: true },
    })

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent ${paymentIntent.id} — skipping`)
      return
    }

    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(`PaymentIntent ${paymentIntent.id} already marked failed — skipping`)
      return
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      })

      if (isValidOrderStatusTransition(payment.order.status, OrderStatus.CANCELLED)) {
        await transaction.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: 'PAYMENT_FAILED',
            statusHistory: {
              create: {
                fromStatus: payment.order.status,
                toStatus: OrderStatus.CANCELLED,
                note: `Stripe PaymentIntent ${paymentIntent.id} failed`,
                createdBy: 'system',
              },
            },
          },
        })
      }
    })

    this.logger.log(`Order ${payment.orderId} cancelled due to payment failure`)
  }

  async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    if (!charge.payment_intent) {
      this.logger.warn(`Charge ${charge.id} has no payment_intent — skipping`)
      return
    }

    const stripePaymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id

    const payment = await this.prismaService.payment.findUnique({
      where: { stripeId: stripePaymentIntentId },
      include: { order: true },
    })

    if (!payment) {
      this.logger.warn(`Payment not found for charge ${charge.id} — skipping`)
      return
    }

    // The admin refund endpoint may set PARTIALLY_REFUNDED before this webhook
    // arrives; we still proceed when moving to a different state (e.g.
    // PARTIALLY_REFUNDED → REFUNDED on a follow-up additional refund).
    const isFullRefund = charge.amount_refunded >= charge.amount
    const targetPaymentStatus = isFullRefund
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED
    const targetOrderStatus = isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED

    if (payment.status === targetPaymentStatus) {
      this.logger.log(`Charge ${charge.id} already at ${targetPaymentStatus} — skipping`)
      return
    }

    const refundAmountInDollars = charge.amount_refunded / 100

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: targetPaymentStatus },
      })

      if (isValidOrderStatusTransition(payment.order.status, targetOrderStatus)) {
        await transaction.order.update({
          where: { id: payment.orderId },
          data: {
            status: targetOrderStatus,
            refundedAt: new Date(),
            refundAmount: refundAmountInDollars,
            statusHistory: {
              create: {
                fromStatus: payment.order.status,
                toStatus: targetOrderStatus,
                note: `Stripe charge ${charge.id} refunded — $${refundAmountInDollars}`,
                createdBy: 'system',
              },
            },
          },
        })
      }
    })

    this.logger.log(`Order ${payment.orderId} refunded — $${refundAmountInDollars}`)

    const recipientEmail = payment.order.guestEmail ?? null
    if (recipientEmail) {
      await this.emailService.sendRefundProcessed({
        recipientEmail,
        orderId: payment.orderId,
        refundAmount: refundAmountInDollars,
      })
    }
  }

  async handleChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id
    const amountUsd = dispute.amount / 100

    this.logger.error(
      `DISPUTE CREATED — dispute ${dispute.id}, charge ${chargeId}, amount $${amountUsd}`,
    )

    // Stripe dispute references a charge — walk back to the PaymentIntent, then
    // to our Payment row (indexed by stripeId = payment_intent id).
    const payment = await this.findPaymentByChargeId(chargeId)

    if (!payment) {
      this.logger.warn(`No matching Payment row for disputed charge ${chargeId} — skipping ON_HOLD`)
      return
    }

    if (isValidOrderStatusTransition(payment.order.status, OrderStatus.ON_HOLD)) {
      await this.prismaService.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.ON_HOLD,
          statusHistory: {
            create: {
              fromStatus: payment.order.status,
              toStatus: OrderStatus.ON_HOLD,
              note: `Chargeback dispute ${dispute.id} filed — reason: ${dispute.reason ?? 'unspecified'}`,
              createdBy: 'stripe-webhook',
            },
          },
        },
      })
      this.logger.log(`Order ${payment.orderId} transitioned to ON_HOLD`)
    } else {
      this.logger.warn(
        `Order ${payment.orderId} in ${payment.order.status} cannot transition to ON_HOLD — admin alert only`,
      )
    }

    // Best-effort alerting: neither Slack nor email failure blocks the webhook
    // ack — Stripe retries the whole webhook otherwise, causing duplicate ON_HOLD
    // transitions in the history.
    const adminUrl = `${this.configService.get<string>('FRONTEND_URL') ?? ''}/admin/orders/${payment.orderId}`
    const alertPayload = {
      disputeId: dispute.id,
      chargeId,
      orderId: payment.orderId,
      amountUsd,
      reason: dispute.reason ?? null,
      adminUrl,
    }

    try {
      await this.slackNotifierService.sendDisputeAlert(alertPayload)
    } catch (error) {
      this.logger.error(
        `Slack dispute alert failed — falling back to email only. ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    try {
      await this.emailService.sendDisputeAlert(alertPayload)
    } catch (error) {
      this.logger.error(
        `Dispute alert email failed for order ${payment.orderId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Payment.stripeId stores the PaymentIntent id (pi_*); dispute.charge references a
  // Charge id (ch_*). We resolve the link via Stripe's API — the charge object
  // exposes payment_intent, which matches our Payment.stripeId.
  private async findPaymentByChargeId(chargeId: string) {
    const charge = await this.stripeService.client.charges.retrieve(chargeId)
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
    if (!paymentIntentId) return null
    return this.prismaService.payment.findUnique({
      where: { stripeId: paymentIntentId },
      include: { order: true },
    })
  }

  private async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) return

    const recipientEmail = order.guestEmail
    if (!recipientEmail) return

    const shippingAddress = order.shippingAddress as {
      fullName: string
      addressLine1: string
      addressLine2?: string
      city: string
      state?: string
      postalCode: string
      country: string
    }

    await this.emailService.sendOrderConfirmation({
      recipientEmail,
      orderId: order.id,
      items: order.items.map((orderItem) => {
        const snapshot = orderItem.productSnapshot as { title?: string } | null
        return {
          title: snapshot?.title ?? 'Jewelry piece',
          quantity: orderItem.quantity,
          price: orderItem.price.toNumber(),
        }
      }),
      subtotal: order.subtotal.toNumber(),
      shippingCost: order.shippingCost.toNumber(),
      total: order.total.toNumber(),
      shippingAddress,
    })
  }
}
