import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
  readonly client: Stripe

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY')

    this.client = new Stripe(stripeSecretKey)
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET')

    // Throws StripeSignatureVerificationError if the signature is invalid.
    // Raw body (Buffer) is required — JSON.parse would break the signature check.
    return this.client.webhooks.constructEvent(rawBody, signature, webhookSecret)
  }

  // idempotencyKey is required (not optional) so admin retry after a local
  // DB failure replays the same key and Stripe returns the existing refund.
  async createRefund(
    paymentIntentId: string,
    amountInDollars: number | undefined,
    idempotencyKey: string,
  ): Promise<Stripe.Refund> {
    return this.client.refunds.create(
      {
        payment_intent: paymentIntentId,
        ...(amountInDollars !== undefined && {
          amount: Math.round(amountInDollars * 100),
        }),
      },
      { idempotencyKey },
    )
  }
}
