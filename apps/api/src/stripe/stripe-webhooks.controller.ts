import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Prisma } from '@prisma/client'
import type { Request } from 'express'
import type Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { StripeWebhooksService } from './stripe-webhooks.service'

// Stripe retries failed webhook deliveries — a 429 would drop legitimate events
// on the floor. Auth here is HMAC signature verification, not rate limiting.
@SkipThrottle()
@Controller('webhooks/stripe')
export class StripeWebhooksController {
  private readonly logger = new Logger(StripeWebhooksController.name)

  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeWebhooksService: StripeWebhooksService,
    private readonly prismaService: PrismaService,
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

    // #540: INSERT-first dedup. Stripe retries after any non-200, so the same
    // event id can arrive multiple times; status-based guards inside each
    // handler catch some cases but not charge.refunded replays, which would
    // double-write OrderStatusHistory. A unique PK on event.id makes the
    // retry a cheap 200 that never reaches the handler.
    try {
      await this.prismaService.processedStripeEvent.create({
        data: { id: stripeEvent.id, type: stripeEvent.type },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.log(
          `Stripe event ${stripeEvent.id} (${stripeEvent.type}) already processed — skipping dispatch`,
        )
        return { received: true }
      }
      throw error
    }

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
        await this.stripeWebhooksService.handleChargeDisputeCreated(
          stripeEvent.data.object as Stripe.Dispute,
        )
        break

      default:
        // Unhandled events are acknowledged but ignored — Stripe stops retrying on 200
        break
    }
  }
}
