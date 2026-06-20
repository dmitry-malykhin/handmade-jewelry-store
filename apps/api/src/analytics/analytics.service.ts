import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PostHog } from 'posthog-node'

interface OrderEventProperties {
  orderId: string
  totalUsd: number
  itemCount: number
}

interface PaymentSucceededProperties {
  orderId: string
  amountUsd: number
  paymentMethod: string
}

interface OrderRefundedProperties {
  orderId: string
  refundAmountUsd: number
  reason: string
  isFullRefund: boolean
}

// Webhook-verified events only — client events can be blocked, replayed, or
// spoofed. SDK is lazy: missing POSTHOG_API_KEY = clean no-op service.
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null

  constructor() {
    const apiKey = process.env.POSTHOG_API_KEY
    this.client = apiKey
      ? new PostHog(apiKey, {
          host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
          flushAt: 20,
          flushInterval: 10_000,
        })
      : null
  }

  // Source of truth for revenue — fire only from the Stripe webhook handler.
  trackPaymentSucceeded(userId: string, properties: PaymentSucceededProperties): void {
    if (!this.client) return
    this.client.capture({
      distinctId: userId,
      event: 'payment_succeeded',
      properties: {
        order_id: properties.orderId,
        amount_usd: properties.amountUsd,
        payment_method: properties.paymentMethod,
      },
    })
  }

  // Pairs with the client `order_placed` to detect drop-off between
  // confirmation page load and DB commit.
  trackOrderCreated(userId: string, properties: OrderEventProperties): void {
    if (!this.client) return
    this.client.capture({
      distinctId: userId,
      event: 'order_created',
      properties: {
        order_id: properties.orderId,
        total_usd: properties.totalUsd,
        item_count: properties.itemCount,
      },
    })
  }

  // Fires AFTER Stripe + DB commit — failed refund attempts don't pollute
  // the post-purchase return-rate funnel.
  trackOrderRefunded(userId: string, properties: OrderRefundedProperties): void {
    if (!this.client) return
    this.client.capture({
      distinctId: userId,
      event: 'order_refunded',
      properties: {
        order_id: properties.orderId,
        refund_amount_usd: properties.refundAmountUsd,
        reason: properties.reason,
        is_full_refund: properties.isFullRefund,
      },
    })
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown()
    }
  }
}
