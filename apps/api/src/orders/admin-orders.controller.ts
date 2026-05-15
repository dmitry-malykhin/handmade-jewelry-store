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
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { OrderQueryDto } from './dto/order-query.dto'
import { RefundOrderDto } from './dto/refund-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { OrdersService } from './orders.service'

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() orderQueryDto: OrderQueryDto) {
    return this.ordersService.findAll(orderQueryDto)
  }

  // Refunds list — placed before :id route so 'refunds' doesn't match :id
  @Get('refunds')
  findAllRefunds() {
    return this.ordersService.findAllRefunds()
  }

  @Get(':id')
  findOne(@Param('id') orderId: string) {
    return this.ordersService.findOneById(orderId)
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') orderId: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, updateOrderStatusDto)
  }

  @Patch(':id/tracking')
  @HttpCode(HttpStatus.OK)
  updateTracking(
    @Param('id') orderId: string,
    @Body() updateOrderTrackingDto: UpdateOrderTrackingDto,
  ) {
    return this.ordersService.updateTracking(orderId, updateOrderTrackingDto)
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  refund(@Param('id') orderId: string, @Body() refundOrderDto: RefundOrderDto) {
    return this.ordersService.refundOrder(orderId, refundOrderDto)
  }
}
