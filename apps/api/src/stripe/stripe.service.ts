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

  /**
   * Issues a refund against a PaymentIntent. `amountInDollars` is converted to
   * cents — Stripe always operates in the smallest currency unit. Omitting the
   * amount produces a full refund (Stripe defaults to the remaining capturable
   * amount).
   *
   * Returns the Stripe Refund object so the caller can record metadata and the
   * resolved amount. Throws StripeError on validation failure (amount exceeds
   * remaining refundable, charge already fully refunded) — controller layer
   * translates to HTTP.
   */
  async createRefund(paymentIntentId: string, amountInDollars?: number): Promise<Stripe.Refund> {
    return this.client.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountInDollars !== undefined && {
        amount: Math.round(amountInDollars * 100),
      }),
    })
  }
}
