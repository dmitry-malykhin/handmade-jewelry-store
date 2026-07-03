import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AdminOrdersAnalyticsService } from './admin-orders-analytics.service'
import { AdminProductsAnalyticsService } from './admin-products-analytics.service'
import { AdminRevenueService } from './admin-revenue.service'
import { AdminService } from './admin.service'
import { RevenueQueryDto } from './dto/revenue-query.dto'
import { TopProductsQueryDto } from './dto/top-products-query.dto'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminRevenueService: AdminRevenueService,
    private readonly adminProductsAnalyticsService: AdminProductsAnalyticsService,
    private readonly adminOrdersAnalyticsService: AdminOrdersAnalyticsService,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.adminService.getStats()
  }

  @Get('stats/revenue')
  @HttpCode(HttpStatus.OK)
  getRevenueStats(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminRevenueService.getRevenueStats(revenueQueryDto.period ?? '30d')
  }

  @Get('analytics/products/top')
  @HttpCode(HttpStatus.OK)
  getTopProducts(@Query() topProductsQueryDto: TopProductsQueryDto) {
    return this.adminProductsAnalyticsService.getTopProducts(
      topProductsQueryDto.period ?? '30d',
      topProductsQueryDto.limit ?? 10,
    )
  }

  @Get('analytics/orders/status-breakdown')
  @HttpCode(HttpStatus.OK)
  getOrderStatusBreakdown(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminOrdersAnalyticsService.getOrderStatusBreakdown(revenueQueryDto.period ?? '30d')
  }

  @Get('analytics/key-metrics')
  @HttpCode(HttpStatus.OK)
  getKeyMetrics(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminRevenueService.getKeyMetrics(revenueQueryDto.period ?? '30d')
  }
}
