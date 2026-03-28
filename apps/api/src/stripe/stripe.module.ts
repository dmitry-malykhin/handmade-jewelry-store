import { Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module'
import { StripeService } from './stripe.service'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeWebhooksService } from './stripe-webhooks.service'

@Module({
  imports: [EmailModule],
  controllers: [StripeWebhooksController],
  providers: [StripeService, StripeWebhooksService],
  exports: [StripeService],
})
export class StripeModule {}
