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
import { StripeService } from './stripe.service'

@Controller('webhooks/stripe')
export class StripeWebhooksController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
  ): { received: boolean } {
    if (!request.rawBody) {
      throw new BadRequestException('Missing raw request body')
    }

    // Throws StripeSignatureVerificationError → caught by HttpExceptionFilter as 400
    this.stripeService.constructWebhookEvent(request.rawBody, stripeSignature)

    // Full event handling (payment_intent.succeeded etc.) is implemented in #71
    return { received: true }
  }
}
