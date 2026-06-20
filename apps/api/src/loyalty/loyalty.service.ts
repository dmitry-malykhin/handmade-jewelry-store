import { Injectable, Logger } from '@nestjs/common'
import { LoyaltyTransactionType, OrderStatus, type Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

// 1 USD spent = 1 point; 100 points = $1.00 off a future order. Earn-rate
// matches redemption-rate by design ("X cents back per dollar"). Decimal
// subtotals are floored — points are integers.
export function calculatePointsEarnedFromSubtotal(subtotalUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) return 0
  return Math.floor(subtotalUsd)
}

// 50 % cap — loyalty can't make an order effectively free (Stripe still bills
// fees against $0). Reused by checkout + server-side validation.
export function calculateMaxRedeemablePoints(subtotalUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) return 0
  return Math.floor(subtotalUsd * 100 * 0.5)
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name)

  constructor(private readonly prismaService: PrismaService) {}

  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { loyaltyBalance: true },
    })
    return { balance: user?.loyaltyBalance ?? 0 }
  }

  async listTransactions(userId: string, limit = 20) {
    return this.prismaService.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // Idempotent — bails when loyaltyPointsEarned > 0 (delivery webhooks can
  // fire twice). Must run inside the same transaction as the order update.
  async awardForDelivered(
    tx: Prisma.TransactionClient,
    order: {
      id: string
      userId: string | null
      subtotal: Prisma.Decimal | number
      loyaltyPointsEarned: number
    },
  ): Promise<number> {
    if (!order.userId) return 0
    if (order.loyaltyPointsEarned > 0) return 0

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

  // No-op when the order never reached DELIVERED.
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
        // Negative keeps the SUM(points) = balance invariant.
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

  // Trusts caller-validated `points` (OrdersService already clamped against
  // balance + per-order cap).
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
