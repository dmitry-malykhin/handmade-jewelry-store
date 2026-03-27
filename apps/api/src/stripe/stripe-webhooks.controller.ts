import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import type Stripe from 'stripe'
import { StripeService } from './stripe.service'
import { StripeWebhooksService } from './stripe-webhooks.service'

@Controller('webhooks/stripe')
export class StripeWebhooksController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeWebhooksService: StripeWebhooksService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
  ): Promise<{ received: boolean }> {
    if (!request.rawBody) {
      throw new BadRequestException('Missing raw request body')
    }

    // Throws StripeSignatureVerificationError if the signature is invalid
    const stripeEvent = this.stripeService.constructWebhookEvent(request.rawBody, stripeSignature)

    await this.dispatchStripeEvent(stripeEvent)

    return { received: true }
  }

  private async dispatchStripeEvent(stripeEvent: Stripe.Event): Promise<void> {
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await this.stripeWebhooksService.handlePaymentIntentSucceeded(
          stripeEvent.data.object as Stripe.PaymentIntent,
        )
        break

      case 'payment_intent.payment_failed':
        await this.stripeWebhooksService.handlePaymentIntentFailed(
          stripeEvent.data.object as Stripe.PaymentIntent,
        )
        break

      case 'charge.refunded':
        await this.stripeWebhooksService.handleChargeRefunded(
          stripeEvent.data.object as Stripe.Charge,
        )
        break

      case 'charge.dispute.created':
        this.stripeWebhooksService.handleChargeDisputeCreated(
          stripeEvent.data.object as Stripe.Dispute,
        )
        break

      default:
        // Unhandled events are acknowledged but ignored — Stripe stops retrying on 200
        break
    }
  }
}
