import { Injectable } from '@nestjs/common'
import type { User } from '@prisma/client'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderExportQueryDto } from './dto/order-export-query.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { OrdersCreateService } from './orders-create.service'
import { OrdersExportService } from './orders-export.service'
import { OrdersQueryService } from './orders-query.service'
import { OrdersStatusService } from './orders-status.service'

// Thin facade preserved so controllers keep a single OrdersService injection.
// Every method delegates to a focused sub-service; add new methods to whichever
// sub-service owns the concern, never here.
@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersCreateService: OrdersCreateService,
    private readonly ordersQueryService: OrdersQueryService,
    private readonly ordersStatusService: OrdersStatusService,
    private readonly ordersExportService: OrdersExportService,
  ) {}

  create(createOrderDto: CreateOrderDto, callerUserId: string | null) {
    return this.ordersCreateService.create(createOrderDto, callerUserId)
  }

  findAll(orderQueryDto: OrderQueryDto) {
    return this.ordersQueryService.findAll(orderQueryDto)
  }

  findUserOrders(userId: string) {
    return this.ordersQueryService.findUserOrders(userId)
  }

  findOneById(orderId: string) {
    return this.ordersQueryService.findOneById(orderId)
  }

  findOneByIdForCaller(orderId: string, caller: User | null, orderAccessToken: string | null) {
    return this.ordersQueryService.findOneByIdForCaller(orderId, caller, orderAccessToken)
  }

  updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersStatusService.updateStatus(orderId, updateOrderStatusDto)
  }

  updateTracking(orderId: string, updateOrderTrackingDto: UpdateOrderTrackingDto) {
    return this.ordersStatusService.updateTracking(orderId, updateOrderTrackingDto)
  }

  exportToCsv(query: OrderExportQueryDto) {
    return this.ordersExportService.exportToCsv(query)
  }
}
