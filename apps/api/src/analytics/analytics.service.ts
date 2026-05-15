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

/**
 * Server-side PostHog event capture. Webhook-driven events (Stripe payment,
 * order status transitions) belong here — they're verified by trusted
 * sources, unlike client events which can be blocked, replayed, or spoofed.
 *
 * Initialisation is lazy: the SDK is only created when POSTHOG_API_KEY is
 * present, so dev / test environments without credentials get a clean no-op
 * service. All capture methods short-circuit when the client is absent.
 */
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

  /**
   * Captures the verified payment success event. Source of truth for revenue
   * — fire this from the Stripe webhook handler, NOT from the browser
   * confirmation page (which can be skipped, double-loaded, or spoofed).
   */
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

  /**
   * Captures the verified order creation event. Fires after the order row
   * exists in the database — pairs with the client `order_placed` to detect
   * drop-off between confirmation page load and DB commit.
   */
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

  /**
   * Captures the admin-initiated refund event. Fires after the Stripe refund
   * succeeds AND the DB transaction commits — so funnel analysis correctly
   * shows post-purchase return rate by reason without double-counting failed
   * refund attempts.
   */
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
