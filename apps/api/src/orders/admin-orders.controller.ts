import {
  Body,
  Controller,
  Get,
  Header,
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
import { OrderExportQueryDto } from './dto/order-export-query.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { RefundOrderDto } from './dto/refund-order.dto'
import { RefundsQueryDto } from './dto/refunds-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { UpdateProductionDto } from './dto/update-production.dto'
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

  // CSV export — placed before :id route so 'export' doesn't match :id
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="orders-export.csv"')
  exportCsv(@Query() orderExportQueryDto: OrderExportQueryDto) {
    return this.ordersService.exportToCsv(orderExportQueryDto)
  }

  // Refunds list — placed before :id route so 'refunds' doesn't match :id
  @Get('refunds')
  findAllRefunds(@Query() refundsQueryDto: RefundsQueryDto) {
    return this.ordersService.findAllRefunds(refundsQueryDto)
  }

  // Production queue — placed before :id route so 'production' doesn't match :id
  @Get('production')
  findProductionQueue() {
    return this.ordersService.findProductionQueue()
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

  @Patch(':id/production')
  @HttpCode(HttpStatus.OK)
  updateProduction(@Param('id') orderId: string, @Body() updateProductionDto: UpdateProductionDto) {
    return this.ordersService.updateProduction(orderId, updateProductionDto)
  }
}
