import { BadRequestException, Injectable } from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import * as Sentry from '@sentry/nestjs'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { OrdersQueryService } from './orders-query.service'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersStatusService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly loyaltyService: LoyaltyService,
    private readonly ordersQueryService: OrdersQueryService,
  ) {}

  async updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.ordersQueryService.findOneById(orderId)

    Sentry.setContext('order', {
      orderId,
      fromStatus: order.status,
      toStatus: updateOrderStatusDto.status,
    })
    Sentry.addBreadcrumb({
      category: 'orders.status',
      message: `updateStatus ${orderId} ${order.status} → ${updateOrderStatusDto.status}`,
      level: 'info',
      data: { orderId, fromStatus: order.status, toStatus: updateOrderStatusDto.status },
    })

    if (!isValidOrderStatusTransition(order.status, updateOrderStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${updateOrderStatusDto.status}`,
      )
    }

    // Atomic with loyalty bookkeeping — a DELIVERED that didn't credit points
    // would show inconsistent state on the account page until fixed by hand.
    const updatedOrder = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status: updateOrderStatusDto.status,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: updateOrderStatusDto.status,
              note: updateOrderStatusDto.note,
              createdBy: 'admin',
            },
          },
        },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      })

      // Both loyalty helpers are idempotent — they bail when there's nothing
      // to do (guest order, points already awarded, etc.).
      if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
        await this.loyaltyService.awardForDelivered(tx, next)
      }
      if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
        await this.loyaltyService.reverseForCancellationOrRefund(tx, next)
      }

      return next
    })

    if (updateOrderStatusDto.status === OrderStatus.SHIPPED) {
      const recipientEmail = updatedOrder.guestEmail
      if (recipientEmail) {
        await this.emailService.sendShippingNotification({
          recipientEmail,
          orderId: updatedOrder.id,
          trackingNumber: updateOrderStatusDto.trackingNumber,
        })
      }
    }

    return updatedOrder
  }

  async updateTracking(orderId: string, updateOrderTrackingDto: UpdateOrderTrackingDto) {
    await this.ordersQueryService.findOneById(orderId)

    return this.prismaService.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: updateOrderTrackingDto.trackingNumber,
        shippingCarrier: updateOrderTrackingDto.shippingCarrier,
        shippedAt: new Date(),
      },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })
  }
}
