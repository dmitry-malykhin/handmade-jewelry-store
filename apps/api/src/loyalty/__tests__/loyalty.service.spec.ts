import { Test, TestingModule } from '@nestjs/testing'
import { LoyaltyTransactionType, OrderStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../../prisma/prisma.service'
import {
  LoyaltyService,
  calculateMaxRedeemablePoints,
  calculatePointsEarnedFromSubtotal,
} from '../loyalty.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/loyalty')
  await $allureSubSuite('loyalty.service')
  await $allureSeverity('normal')
})

describe('loyalty math helpers', () => {
  describe('calculatePointsEarnedFromSubtotal', () => {
    it('returns 1 point per whole dollar (floored)', () => {
      // $68.49 → 68 points = $0.68 back. We never accrue partial points.
      expect(calculatePointsEarnedFromSubtotal(68.49)).toBe(68)
      expect(calculatePointsEarnedFromSubtotal(100)).toBe(100)
    })

    it('returns 0 for zero or negative inputs', () => {
      expect(calculatePointsEarnedFromSubtotal(0)).toBe(0)
      expect(calculatePointsEarnedFromSubtotal(-5)).toBe(0)
    })

    it('returns 0 for non-finite values (NaN / Infinity)', () => {
      expect(calculatePointsEarnedFromSubtotal(Number.NaN)).toBe(0)
      expect(calculatePointsEarnedFromSubtotal(Number.POSITIVE_INFINITY)).toBe(0)
    })
  })

  describe('calculateMaxRedeemablePoints', () => {
    it('caps at 50% of the subtotal in points', () => {
      // $100 subtotal → max 5000 points = $50 off. The other 50% must be
      // paid in real money so Stripe fees aren't applied against $0.
      expect(calculateMaxRedeemablePoints(100)).toBe(5000)
      expect(calculateMaxRedeemablePoints(68.5)).toBe(3425)
    })

    it('returns 0 for zero / negative subtotals', () => {
      expect(calculateMaxRedeemablePoints(0)).toBe(0)
      expect(calculateMaxRedeemablePoints(-50)).toBe(0)
    })
  })
})

describe('LoyaltyService', () => {
  const mockPrismaService = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    loyaltyTransaction: { findMany: jest.fn(), create: jest.fn() },
    order: { update: jest.fn() },
  }

  let loyaltyService: LoyaltyService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    loyaltyService = module.get<LoyaltyService>(LoyaltyService)
  })

  describe('getBalance', () => {
    it('returns the user balance', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ loyaltyBalance: 250 })

      const result = await loyaltyService.getBalance('user-1')

      expect(result).toEqual({ balance: 250 })
    })

    it('returns 0 when the user does not exist (defensive)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null)

      const result = await loyaltyService.getBalance('missing')

      expect(result).toEqual({ balance: 0 })
    })
  })

  describe('awardForDelivered', () => {
    function buildTxMock() {
      return {
        user: { update: jest.fn() },
        order: { update: jest.fn() },
        loyaltyTransaction: { create: jest.fn() },
      }
    }

    it('skips guest orders (userId=null)', async () => {
      const tx = buildTxMock()
      const result = await loyaltyService.awardForDelivered(tx as never, {
        id: 'order-1',
        userId: null,
        subtotal: new Decimal('68'),
        loyaltyPointsEarned: 0,
      })

      expect(result).toBe(0)
      expect(tx.user.update).not.toHaveBeenCalled()
    })

    it('is idempotent — does not re-award when loyaltyPointsEarned already > 0', async () => {
      const tx = buildTxMock()
      const result = await loyaltyService.awardForDelivered(tx as never, {
        id: 'order-1',
        userId: 'user-1',
        subtotal: new Decimal('68'),
        loyaltyPointsEarned: 68, // already awarded earlier
      })

      expect(result).toBe(0)
      expect(tx.user.update).not.toHaveBeenCalled()
    })

    it('credits points, stamps the order, writes an EARNED audit row', async () => {
      const tx = buildTxMock()
      const result = await loyaltyService.awardForDelivered(tx as never, {
        id: 'order-abc12345',
        userId: 'user-1',
        subtotal: new Decimal('68.50'),
        loyaltyPointsEarned: 0,
      })

      expect(result).toBe(68)
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyBalance: { increment: 68 } },
      })
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-abc12345' },
        data: { loyaltyPointsEarned: 68 },
      })
      expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          orderId: 'order-abc12345',
          points: 68,
          type: LoyaltyTransactionType.EARNED,
          note: expect.stringContaining('delivered'),
        },
      })
    })
  })

  describe('reverseForCancellationOrRefund', () => {
    function buildTxMock() {
      return {
        user: { update: jest.fn() },
        order: { update: jest.fn() },
        loyaltyTransaction: { create: jest.fn() },
      }
    }

    it('does nothing when no points were ever awarded (loyaltyPointsEarned=0)', async () => {
      const tx = buildTxMock()
      const result = await loyaltyService.reverseForCancellationOrRefund(tx as never, {
        id: 'order-1',
        userId: 'user-1',
        loyaltyPointsEarned: 0,
        status: OrderStatus.CANCELLED,
      })

      expect(result).toBe(0)
      expect(tx.user.update).not.toHaveBeenCalled()
    })

    it('debits the balance, zeroes loyaltyPointsEarned, writes a REVERSED audit row', async () => {
      const tx = buildTxMock()
      const result = await loyaltyService.reverseForCancellationOrRefund(tx as never, {
        id: 'order-1',
        userId: 'user-1',
        loyaltyPointsEarned: 68,
        status: OrderStatus.REFUNDED,
      })

      expect(result).toBe(68)
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyBalance: { decrement: 68 } },
      })
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { loyaltyPointsEarned: 0 },
      })
      expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          orderId: 'order-1',
          // Negative — invariant SUM(points) = balance
          points: -68,
          type: LoyaltyTransactionType.REVERSED,
          note: expect.stringContaining('refunded'),
        },
      })
    })
  })

  describe('spendForCheckout', () => {
    it('no-ops on zero points', async () => {
      const tx = {
        user: { update: jest.fn() },
        loyaltyTransaction: { create: jest.fn() },
      }
      await loyaltyService.spendForCheckout(tx as never, {
        userId: 'user-1',
        orderId: 'order-1',
        points: 0,
      })

      expect(tx.user.update).not.toHaveBeenCalled()
      expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled()
    })

    it('decrements balance and writes a SPENT audit row', async () => {
      const tx = {
        user: { update: jest.fn() },
        loyaltyTransaction: { create: jest.fn() },
      }
      await loyaltyService.spendForCheckout(tx as never, {
        userId: 'user-1',
        orderId: 'order-1',
        points: 500,
      })

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyBalance: { decrement: 500 } },
      })
      expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          orderId: 'order-1',
          points: -500,
          type: LoyaltyTransactionType.SPENT,
          note: expect.stringContaining('redemption'),
        },
      })
    })
  })
})
