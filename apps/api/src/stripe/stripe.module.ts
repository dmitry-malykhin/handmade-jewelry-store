import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeWebhooksService } from './stripe-webhooks.service'

@Module({
  controllers: [StripeWebhooksController],
  providers: [StripeService, StripeWebhooksService],
  exports: [StripeService],
})
export class StripeModule {}
