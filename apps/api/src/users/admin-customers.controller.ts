import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto'
import { UsersService } from './users.service'

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCustomersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() adminCustomerQueryDto: AdminCustomerQueryDto) {
    return this.usersService.findAllCustomers(adminCustomerQueryDto)
  }

  @Get(':id')
  findOne(@Param('id') userId: string) {
    return this.usersService.findCustomerById(userId)
  }
}
