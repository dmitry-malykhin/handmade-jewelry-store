import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { ConfirmNewsletterDto } from './dto/confirm.dto'
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
  async subscribe(
    @Body() dto: SubscribeNewsletterDto,
    @Req() request: Request,
  ): Promise<{ status: string }> {
    const result = await this.newsletterService.subscribe({
      email: dto.email,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      sourceUrl: dto.sourceUrl ?? null,
    })
    return { status: result.status }
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 10, ttl: 60_000 },
  })
  async confirm(@Body() dto: ConfirmNewsletterDto): Promise<{ status: string }> {
    const result = await this.newsletterService.confirm(dto.email, dto.token)
    return { status: result.status }
  }
}
