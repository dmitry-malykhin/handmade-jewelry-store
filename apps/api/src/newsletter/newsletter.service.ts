import { Injectable, Logger } from '@nestjs/common'
import { KlaviyoNewsletterClient, type SubscribeResult } from './klaviyo-newsletter.client'

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name)

  constructor(private readonly klaviyoClient: KlaviyoNewsletterClient) {}

  async subscribe(email: string): Promise<SubscribeResult> {
    const result = await this.klaviyoClient.subscribeEmail(email)
    this.logger.log(`Newsletter subscription accepted for ${maskEmail(email)} (${result.status})`)
    return result
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}
