import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { StripeWebhooksController } from './stripe-webhooks.controller'

@Module({
  controllers: [StripeWebhooksController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
