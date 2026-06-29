import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, Prisma, StockType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateProductionDto } from './dto/update-production.dto'

@Injectable()
export class OrdersProductionService {
  constructor(private readonly prismaService: PrismaService) {}

  // Orders with at least one MADE_TO_ORDER item that haven't shipped yet,
  // enriched with a single deadline per order so the table stays scan-able.
  async findProductionQueue() {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
        items: {
          some: { product: { stockType: StockType.MADE_TO_ORDER } },
        },
      },
      include: {
        items: { include: { product: { select: { stockType: true, productionDays: true } } } },
      },
    })

    const enriched = orders.map((order) => {
      const mtoProductionDays = order.items
        .filter((item) => item.product?.stockType === StockType.MADE_TO_ORDER)
        .map((item) => item.product?.productionDays ?? 0)
      const maxProductionDays = mtoProductionDays.length > 0 ? Math.max(...mtoProductionDays) : 0
      const deadline = new Date(order.createdAt)
      deadline.setDate(deadline.getDate() + maxProductionDays)
      return {
        ...order,
        maxProductionDays,
        productionDeadlineAt: deadline.toISOString(),
      }
    })

    enriched.sort(
      (a, b) =>
        new Date(a.productionDeadlineAt).getTime() - new Date(b.productionDeadlineAt).getTime(),
    )

    return enriched
  }

  // Production flow is forward-only: QUEUED → IN_PRODUCTION → READY_TO_SHIP.
  // Reverse transitions are blocked to prevent accidental clobbering;
  // resetting requires direct DB access.
  async updateProduction(orderId: string, updateProductionDto: UpdateProductionDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      select: { id: true, productionStatus: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    if (
      !isValidProductionStatusTransition(
        order.productionStatus,
        updateProductionDto.productionStatus,
      )
    ) {
      throw new BadRequestException(
        `Order ${orderId} cannot transition production status from ${order.productionStatus} to ${updateProductionDto.productionStatus}`,
      )
    }

    return this.prismaService.order.update({
      where: { id: orderId },
      data: {
        productionStatus: updateProductionDto.productionStatus,
        productionNotes: updateProductionDto.productionNotes ?? null,
      },
      include: {
        items: { include: { product: { select: { stockType: true, productionDays: true } } } },
      },
    })
  }
}

// Same-state writes are allowed so "update note without changing status" works.
function isValidProductionStatusTransition(
  fromStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
  toStatus: Prisma.OrderGetPayload<{ select: { productionStatus: true } }>['productionStatus'],
): boolean {
  if (fromStatus === toStatus) return true
  if (fromStatus === 'QUEUED' && toStatus === 'IN_PRODUCTION') return true
  if (fromStatus === 'IN_PRODUCTION' && toStatus === 'READY_TO_SHIP') return true
  // Direct skip for trivial pieces (e.g. ready stock mis-classified MTO).
  if (fromStatus === 'QUEUED' && toStatus === 'READY_TO_SHIP') return true
  return false
}
