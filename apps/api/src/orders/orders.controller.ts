import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User | null) {
    return this.ordersService.create(createOrderDto, user?.id ?? null)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query() orderQueryDto: OrderQueryDto) {
    return this.ordersService.findAll(orderQueryDto)
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyOrders(@CurrentUser() user: User) {
    return this.ordersService.findUserOrders(user.id)
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') orderId: string,
    @CurrentUser() user: User | null,
    @Query('token') orderAccessToken?: string,
  ) {
    return this.ordersService.findOneByIdForCaller(orderId, user, orderAccessToken ?? null)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(@Param('id') orderId: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, updateOrderStatusDto)
  }
}
