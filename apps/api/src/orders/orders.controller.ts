import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Role, type User } from '@prisma/client'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { AcceptOrderTermsDto } from './dto/accept-order-terms.dto'
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
    // Header preferred — query kept for Stripe redirect callback (return_url).
    @Headers('x-order-access-token') headerToken?: string,
    @Query('token') queryToken?: string,
  ) {
    return this.ordersService.findOneByIdForCaller(orderId, user, headerToken ?? queryToken ?? null)
  }

  @Post(':id/terms')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  acceptTerms(
    @Param('id') orderId: string,
    @Body() acceptOrderTermsDto: AcceptOrderTermsDto,
    @CurrentUser() user: User | null,
    @Req() request: Request,
    @Headers('x-order-access-token') headerToken?: string,
  ) {
    return this.ordersService.acceptTerms(orderId, acceptOrderTermsDto, user, headerToken ?? null, {
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    })
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(@Param('id') orderId: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, updateOrderStatusDto)
  }
}
