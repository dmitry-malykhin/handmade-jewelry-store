import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { AuthModule } from '../auth/auth.module'
import { DiscountsModule } from '../discounts/discounts.module'
import { EmailModule } from '../email/email.module'
import { LoyaltyModule } from '../loyalty/loyalty.module'
import { PrismaModule } from '../prisma/prisma.module'
import { StripeModule } from '../stripe/stripe.module'
import { AdminOrdersController } from './admin-orders.controller'
import { OrdersController } from './orders.controller'
import { OrdersCreateService } from './orders-create.service'
import { OrdersExportService } from './orders-export.service'
import { OrdersProductionService } from './orders-production.service'
import { OrdersQueryService } from './orders-query.service'
import { OrdersRefundsService } from './orders-refunds.service'
import { OrdersStatusService } from './orders-status.service'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EmailModule,
    StripeModule,
    LoyaltyModule,
    AnalyticsModule,
    DiscountsModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    OrdersCreateService,
    OrdersQueryService,
    OrdersStatusService,
    OrdersExportService,
    OrdersRefundsService,
    OrdersProductionService,
  ],
})
export class OrdersModule {}
