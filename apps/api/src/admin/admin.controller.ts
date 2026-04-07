import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AdminService } from './admin.service'
import { RevenueQueryDto } from './dto/revenue-query.dto'

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
}
