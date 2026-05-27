import { Injectable, Logger } from '@nestjs/common'
import { LoyaltyTransactionType, OrderStatus, type Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/**
 * 1 USD spent = 1 loyalty point. 100 points = $1.00 reduction on a future
 * order. The earn-rate matches the redemption-rate by design — keeps the
 * mental model crisp ("X cents back per dollar"). Decimal cents (e.g.
 * subtotal $68.49) are floored — points are integers and we don't accrue
 * partial points.
 */
export function calculatePointsEarnedFromSubtotal(subtotalUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) return 0
  return Math.floor(subtotalUsd)
}

/**
 * Max points a single order can redeem. 50% cap so loyalty programs can't
 * make a real order effectively free — Stripe fees still apply against $0.
 * Reused in checkout validation and on the server before deducting.
 */
export function calculateMaxRedeemablePoints(subtotalUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) return 0
  // 1 point = $0.01 → subtotal * 100 = subtotal in points. Half of that is
  // the cap.
  return Math.floor(subtotalUsd * 100 * 0.5)
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name)

  constructor(private readonly prismaService: PrismaService) {}

  /** Current point balance for the authenticated user. */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { loyaltyBalance: true },
    })
    return { balance: user?.loyaltyBalance ?? 0 }
  }

  /** Most-recent transactions first — used on /account/loyalty. */
  async listTransactions(userId: string, limit = 20) {
    return this.prismaService.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Award points for an order that just transitioned to DELIVERED. Idempotent:
   * if `Order.loyaltyPointsEarned` is already non-zero we treat it as
   * already-awarded and exit without double-crediting (delivery-event
   * webhooks can fire twice).
   *
   * Must be called inside a Prisma transaction together with the order
   * update — partial state is worse than no state.
   */
  async awardForDelivered(
    tx: Prisma.TransactionClient,
    order: {
      id: string
      userId: string | null
      subtotal: Prisma.Decimal | number
      loyaltyPointsEarned: number
    },
  ): Promise<number> {
    if (!order.userId) return 0 // guest orders — no account to credit
    if (order.loyaltyPointsEarned > 0) return 0 // already awarded; idempotent

    const subtotalNumber = Number(order.subtotal)
    const pointsEarned = calculatePointsEarnedFromSubtotal(subtotalNumber)
    if (pointsEarned <= 0) return 0

    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyBalance: { increment: pointsEarned } },
    })
    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyPointsEarned: pointsEarned },
    })
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        points: pointsEarned,
        type: LoyaltyTransactionType.EARNED,
        note: `Order ${order.id.slice(-8)} delivered`,
      },
    })

    this.logger.log(`Awarded ${pointsEarned} loyalty points to user ${order.userId}`)
    return pointsEarned
  }

  /**
   * Reverse points that were previously awarded for an order that's now
   * being cancelled or refunded. Symmetric to `awardForDelivered`: if the
   * order never reached DELIVERED (and thus `loyaltyPointsEarned === 0`),
   * this is a no-op.
   */
  async reverseForCancellationOrRefund(
    tx: Prisma.TransactionClient,
    order: { id: string; userId: string | null; loyaltyPointsEarned: number; status: OrderStatus },
  ): Promise<number> {
    if (!order.userId) return 0
    if (order.loyaltyPointsEarned <= 0) return 0

    const pointsToReverse = order.loyaltyPointsEarned
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyBalance: { decrement: pointsToReverse } },
    })
    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyPointsEarned: 0 },
    })
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        // Negative — keeps SUM(points) = balance invariant.
        points: -pointsToReverse,
        type: LoyaltyTransactionType.REVERSED,
        note: `Order ${order.id.slice(-8)} ${order.status.toLowerCase()}`,
      },
    })

    this.logger.log(
      `Reversed ${pointsToReverse} loyalty points from user ${order.userId} (order ${order.status})`,
    )
    return pointsToReverse
  }

  /**
   * Debit points at checkout when the buyer chose to redeem some of their
   * balance. Caller (OrdersService) has already validated the amount fits
   * `getBalance()` and `calculateMaxRedeemablePoints(subtotal)` — this method
   * trusts its input and only does the bookkeeping.
   */
  async spendForCheckout(
    tx: Prisma.TransactionClient,
    params: { userId: string; orderId: string; points: number },
  ): Promise<void> {
    if (params.points <= 0) return

    await tx.user.update({
      where: { id: params.userId },
      data: { loyaltyBalance: { decrement: params.points } },
    })
    await tx.loyaltyTransaction.create({
      data: {
        userId: params.userId,
        orderId: params.orderId,
        points: -params.points,
        type: LoyaltyTransactionType.SPENT,
        note: `Order ${params.orderId.slice(-8)} redemption`,
      },
    })
  }
}
