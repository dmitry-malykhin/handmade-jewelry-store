import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { AdminController } from './admin.controller'
import { AdminOrdersAnalyticsService } from './admin-orders-analytics.service'
import { AdminProductsAnalyticsService } from './admin-products-analytics.service'
import { AdminRevenueService } from './admin-revenue.service'
import { AdminService } from './admin.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRevenueService,
    AdminProductsAnalyticsService,
    AdminOrdersAnalyticsService,
  ],
})
export class AdminModule {}
