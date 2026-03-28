import { Injectable, Logger } from '@nestjs/common'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { isValidOrderStatusTransition } from '../orders/order-status.transitions'

@Injectable()
export class StripeWebhooksService {
  private readonly logger = new Logger(StripeWebhooksService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
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

    // Idempotency guard: skip if already processed
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

    if (payment.status === PaymentStatus.REFUNDED) {
      this.logger.log(`Charge ${charge.id} already refunded — skipping`)
      return
    }

    const refundAmountInDollars = charge.amount_refunded / 100

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      })

      if (isValidOrderStatusTransition(payment.order.status, OrderStatus.REFUNDED)) {
        await transaction.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.REFUNDED,
            refundedAt: new Date(),
            refundAmount: refundAmountInDollars,
            statusHistory: {
              create: {
                fromStatus: payment.order.status,
                toStatus: OrderStatus.REFUNDED,
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

  handleChargeDisputeCreated(dispute: Stripe.Dispute): void {
    // Post-MVP: send Slack/email alert and transition order to ON_HOLD
    this.logger.error(
      `DISPUTE CREATED — dispute ID: ${dispute.id}, charge: ${dispute.charge}, amount: $${dispute.amount / 100}`,
    )
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
