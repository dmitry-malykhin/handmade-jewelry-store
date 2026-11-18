import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { OrderStatus, StockType } from '@prisma/client'
import * as Sentry from '@sentry/nestjs'
import { getFrontendUrl } from '../common/config/urls'
import { JwtService } from '@nestjs/jwt'
import { EmailService } from '../email/email.service'
import type { ReviewRequestItem } from '../email/templates/review-request.template'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { buildUnsubscribeUrl } from '../newsletter/newsletter.service'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto'
import { issueOrderAccessToken } from './order-access-token'
import { OrdersQueryService } from './orders-query.service'
import { isValidOrderStatusTransition } from './order-status.transitions'

@Injectable()
export class OrdersStatusService {
  private readonly logger = new Logger(OrdersStatusService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly loyaltyService: LoyaltyService,
    private readonly ordersQueryService: OrdersQueryService,
    private readonly jwtService: JwtService,
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
          // #524: product.stockType + productionDays are read at PROCESSING
          // to decide whether to fire the "now crafting" email and what
          // ship-by date to show.
          items: { include: { product: true } },
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

    // #524: PAID → PROCESSING on a made-to-order piece — tell the buyer work
    // has begun and when to expect shipment. The product-page UX promises a
    // 3-7 day production window, so silence here is a cancellation / 'is my
    // order lost?' driver.
    if (updateOrderStatusDto.status === OrderStatus.PROCESSING) {
      const recipientEmail = updatedOrder.guestEmail
      const madeToOrderItems = updatedOrder.items.filter(
        (orderItem) => orderItem.product?.stockType === StockType.MADE_TO_ORDER,
      )
      if (recipientEmail && madeToOrderItems.length > 0) {
        const items = madeToOrderItems
          .map((orderItem) => {
            const snapshot = orderItem.productSnapshot as { title?: unknown } | null
            const title = typeof snapshot?.title === 'string' ? snapshot.title : null
            return title ? { title } : null
          })
          .filter((item): item is { title: string } => item !== null)

        const maxProductionDays = madeToOrderItems.reduce(
          (longest, orderItem) => Math.max(longest, orderItem.product?.productionDays ?? 0),
          0,
        )
        const expectedShipByText =
          maxProductionDays > 0
            ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(
                new Date(updatedOrder.createdAt.getTime() + maxProductionDays * 86_400_000),
              )
            : null

        // Best-effort — email failure never rolls back the PROCESSING
        // transition itself.
        try {
          await this.emailService.sendProductionStarted({
            recipientEmail,
            orderId: updatedOrder.id,
            items,
            expectedShipByText,
            orderAccessToken: issueOrderAccessToken(this.jwtService, updatedOrder.id),
          })
        } catch (error) {
          this.logger.error(
            `Production-started email failed for order ${updatedOrder.id} — PROCESSING itself succeeded`,
            error instanceof Error ? error.stack : String(error),
          )
        }
      }
    }

    if (updateOrderStatusDto.status === OrderStatus.SHIPPED) {
      const recipientEmail = updatedOrder.guestEmail
      if (recipientEmail) {
        await this.emailService.sendShippingNotification({
          recipientEmail,
          orderId: updatedOrder.id,
          trackingNumber: updateOrderStatusDto.trackingNumber,
          shippingCarrier:
            updateOrderStatusDto.shippingCarrier ?? updatedOrder.shippingCarrier ?? undefined,
          orderAccessToken: issueOrderAccessToken(this.jwtService, updatedOrder.id),
        })
      }
    }

    if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
      const recipientEmail = updatedOrder.guestEmail
      if (recipientEmail) {
        const items = updatedOrder.items
          .map((orderItem) => {
            const snapshot = orderItem.productSnapshot as {
              slug?: unknown
              title?: unknown
            } | null
            if (
              !snapshot ||
              typeof snapshot.slug !== 'string' ||
              typeof snapshot.title !== 'string'
            ) {
              return null
            }
            return { productSlug: snapshot.slug, title: snapshot.title }
          })
          .filter((item): item is ReviewRequestItem => item !== null)

        if (items.length > 0) {
          // Best-effort — a failed review email must not roll back the
          // DELIVERED transition (loyalty points already awarded above).
          try {
            await this.emailService.sendReviewRequest({
              recipientEmail,
              orderId: updatedOrder.id,
              items,
              frontendUrl: getFrontendUrl(),
              unsubscribeUrl: buildUnsubscribeUrl(recipientEmail),
            })
          } catch (error) {
            this.logger.error(
              `Review-request email failed for order ${updatedOrder.id} — DELIVERED itself succeeded`,
              error instanceof Error ? error.stack : String(error),
            )
          }
        }
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
