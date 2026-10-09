import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../email/email.module'
import { SlackNotifierService } from './slack-notifier.service'
import { StripeService } from './stripe.service'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeWebhooksService } from './stripe-webhooks.service'

@Module({
  imports: [EmailModule, AuthModule],
  controllers: [StripeWebhooksController],
  providers: [StripeService, StripeWebhooksService, SlackNotifierService],
  exports: [StripeService],
})
export class StripeModule {}
