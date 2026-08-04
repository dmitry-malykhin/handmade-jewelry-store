import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PaymentsService } from './payments.service'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<{ clientSecret: string }> {
    return this.paymentsService.createPaymentIntent(createPaymentIntentDto.orderId)
  }
}
