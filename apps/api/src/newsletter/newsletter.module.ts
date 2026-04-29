import { Module } from '@nestjs/common'
import { KlaviyoNewsletterClient } from './klaviyo-newsletter.client'
import { NewsletterController } from './newsletter.controller'
import { NewsletterService } from './newsletter.service'

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, KlaviyoNewsletterClient],
})
export class NewsletterModule {}
