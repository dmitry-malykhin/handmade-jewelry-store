import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { OrdersModule } from '../orders/orders.module'
import { StripeModule } from '../stripe/stripe.module'

@Module({
  imports: [StripeModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
