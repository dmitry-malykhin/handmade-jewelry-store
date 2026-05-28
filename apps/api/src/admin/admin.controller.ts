import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AdminService } from './admin.service'
import { RevenueQueryDto } from './dto/revenue-query.dto'
import { TopProductsQueryDto } from './dto/top-products-query.dto'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.adminService.getStats()
  }

  @Get('stats/revenue')
  @HttpCode(HttpStatus.OK)
  getRevenueStats(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminService.getRevenueStats(revenueQueryDto.period ?? '30d')
  }

  @Get('analytics/products/top')
  @HttpCode(HttpStatus.OK)
  getTopProducts(@Query() topProductsQueryDto: TopProductsQueryDto) {
    return this.adminService.getTopProducts(
      topProductsQueryDto.period ?? '30d',
      topProductsQueryDto.limit ?? 10,
    )
  }

  @Get('analytics/orders/status-breakdown')
  @HttpCode(HttpStatus.OK)
  getOrderStatusBreakdown(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminService.getOrderStatusBreakdown(revenueQueryDto.period ?? '30d')
  }

  @Get('analytics/key-metrics')
  @HttpCode(HttpStatus.OK)
  getKeyMetrics(@Query() revenueQueryDto: RevenueQueryDto) {
    return this.adminService.getKeyMetrics(revenueQueryDto.period ?? '30d')
  }
}
