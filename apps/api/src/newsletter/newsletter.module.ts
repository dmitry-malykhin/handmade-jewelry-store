import { Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module'
import { KlaviyoNewsletterClient } from './klaviyo-newsletter.client'
import { NewsletterController } from './newsletter.controller'
import { NewsletterService } from './newsletter.service'

@Module({
  imports: [EmailModule],
  controllers: [NewsletterController],
  providers: [NewsletterService, KlaviyoNewsletterClient],
  // Exported so UsersService.deleteSelfAccount (#642) can revoke the Klaviyo
  // profile on account deletion without duplicating the HTTP wiring.
  exports: [KlaviyoNewsletterClient],
})
export class NewsletterModule {}
