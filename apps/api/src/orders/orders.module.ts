import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../email/email.module'
import { LoyaltyModule } from '../loyalty/loyalty.module'
import { PrismaModule } from '../prisma/prisma.module'
import { StripeModule } from '../stripe/stripe.module'
import { AdminOrdersController } from './admin-orders.controller'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [PrismaModule, AuthModule, EmailModule, StripeModule, LoyaltyModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
