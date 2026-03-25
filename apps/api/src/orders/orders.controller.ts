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
} from '@nestjs/common'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto)
  }

  // TODO #72: add @UseGuards(JwtAuthGuard) + @Roles('ADMIN') when auth is implemented
  @Get()
  findAll(@Query() orderQueryDto: OrderQueryDto) {
    return this.ordersService.findAll(orderQueryDto)
  }

  @Get(':id')
  findOne(@Param('id') orderId: string) {
    return this.ordersService.findOneById(orderId)
  }

  // TODO #72: add @UseGuards(JwtAuthGuard) + @Roles('ADMIN') when auth is implemented
  @Patch(':id/status')
  updateStatus(@Param('id') orderId: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, updateOrderStatusDto)
  }
}
