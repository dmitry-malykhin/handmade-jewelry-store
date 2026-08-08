import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { OrderStatus, Prisma } from '@prisma/client'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { DiscountsService, type AppliedDiscount } from '../discounts/discounts.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'

@Injectable()
export class OrdersCreateService {
  private readonly logger = new Logger(OrdersCreateService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly loyaltyService: LoyaltyService,
    private readonly discountsService: DiscountsService,
    private readonly jwtService: JwtService,
  ) {}

  // Signed short-lived credential returned by POST /orders. The confirmation
  // page uses it via ?token= so guests can fetch their own order without a
  // user JWT (#392).
  private issueOrderAccessToken(orderId: string): string {
    return this.jwtService.sign({ orderId, purpose: 'order-access' as const }, { expiresIn: '24h' })
  }

  async create(createOrderDto: CreateOrderDto, callerUserId: string | null) {
    const {
      items,
      shippingAddress,
      guestEmail,
      subtotal,
      shippingCost,
      total,
      loyaltyPointsToRedeem,
      discountCode,
      source,
    } = createOrderDto
    // Trust only the JWT. A client-supplied userId in the body used to be
    // accepted here (see #391) — anyone could attach a guest order to any
    // other user's account.
    const userId = callerUserId

    // Re-verify the client's loyaltyPointsToRedeem against the real balance
    // and the per-order cap (50% of subtotal); recalculate `total` server-side.
    let pointsToRedeem = 0
    let adjustedTotal = total
    if (userId && loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
      const { balance } = await this.loyaltyService.getBalance(userId)
      const maxRedeemable = Math.floor(subtotal * 100 * 0.5)
      pointsToRedeem = Math.min(loyaltyPointsToRedeem, balance, maxRedeemable)
      if (pointsToRedeem > 0) {
        const redemptionUsd = pointsToRedeem / 100
        adjustedTotal = Math.max(0, Number((total - redemptionUsd).toFixed(2)))
      }
    }

    try {
      const order = await this.prismaService.$transaction(async (tx) => {
        // Discount applies before order.create so a rejected code aborts
        // the whole transaction — the counter bump and the row insert
        // succeed or fail together.
        let appliedDiscount: AppliedDiscount | null = null
        if (discountCode) {
          appliedDiscount = await this.discountsService.applyOnOrderCreate(tx, {
            code: discountCode,
            subtotalCents: Math.round(subtotal * 100),
          })
          const discountUsd = appliedDiscount.discountAmountCents / 100
          adjustedTotal = Math.max(0, Number((adjustedTotal - discountUsd).toFixed(2)))
        }

        const created = await tx.order.create({
          data: {
            userId: userId ?? null,
            guestEmail: guestEmail ?? null,
            subtotal,
            shippingCost,
            total: adjustedTotal,
            loyaltyPointsUsed: pointsToRedeem,
            discountCode: appliedDiscount?.code ?? null,
            discountAmountCents: appliedDiscount?.discountAmountCents ?? null,
            discountType: appliedDiscount?.type ?? null,
            shippingAddress: shippingAddress as unknown as InputJsonValue,
            source: source ?? 'web',
            status: OrderStatus.PENDING,
            items: {
              create: items.map((orderItem) => ({
                productId: orderItem.productId,
                quantity: orderItem.quantity,
                price: orderItem.price,
                productSnapshot: orderItem.productSnapshot,
              })),
            },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: OrderStatus.PENDING,
                createdBy: userId ?? guestEmail ?? 'guest',
              },
            },
          },
          include: {
            items: true,
            statusHistory: true,
          },
        })

        if (pointsToRedeem > 0 && userId) {
          await this.loyaltyService.spendForCheckout(tx, {
            userId,
            orderId: created.id,
            points: pointsToRedeem,
          })
        }

        return created
      })

      return { ...order, accessToken: this.issueOrderAccessToken(order.id) }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const field = error.meta?.field_name ?? 'unknown field'
          this.logger.warn(`Order creation failed — foreign key constraint on ${field}`)
          throw new BadRequestException(
            `One or more items reference a product that does not exist (${field})`,
          )
        }
        if (error.code === 'P2025') {
          throw new BadRequestException('One or more referenced records do not exist')
        }
      }
      throw error
    }
  }
}
