import { Body, Controller, Headers, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { User } from '@prisma/client'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'
import { PaymentsService } from './payments.service'

@Controller('payments')
@UseGuards(OptionalJwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @CurrentUser() user: User | null,
    @Headers('x-order-access-token') headerToken?: string,
    @Query('token') queryToken?: string,
  ): Promise<{ clientSecret: string }> {
    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto.orderId,
      user,
      headerToken ?? queryToken ?? null,
    )
  }
}
