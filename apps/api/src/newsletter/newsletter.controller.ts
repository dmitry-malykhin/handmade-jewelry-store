import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { SubscribeNewsletterDto } from './dto/subscribe.dto'
import { NewsletterService } from './newsletter.service'

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  async subscribe(@Body() dto: SubscribeNewsletterDto): Promise<{ status: string }> {
    const result = await this.newsletterService.subscribe(dto.email)
    return { status: result.status }
  }
}
