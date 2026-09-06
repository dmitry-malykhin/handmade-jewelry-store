import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { SubscribeNewsletterDto } from './dto/subscribe.dto'
import { NewsletterService } from './newsletter.service'

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // Two windows: 3/min blocks burst, 20/day blocks slow-drip email-enumeration.
  @Post('subscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: { limit: 3, ttl: 60_000 },
    newsletterDaily: { limit: 20, ttl: 86_400_000 },
  })
  async subscribe(@Body() dto: SubscribeNewsletterDto): Promise<{ status: string }> {
    const result = await this.newsletterService.subscribe(dto.email)
    return { status: result.status }
  }
}
