import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { OrdersRefundsService } from './orders-refunds.service'

type TransactionCallback = (tx: typeof mockPrismaService) => Promise<unknown>

const mockPrismaService = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    update: jest.fn(),
  },
  $transaction: jest.fn(
    (callback: TransactionCallback): Promise<unknown> => callback(mockPrismaService),
  ),
}

const mockEmailService = {
  sendRefundProcessed: jest.fn(),
}

const mockStripeService = {
  createRefund: jest.fn(),
}

const mockAnalyticsService = {
  trackOrderRefunded: jest.fn(),
}

const mockLoyaltyService = {
  reverseForCancellationOrRefund: jest.fn().mockResolvedValue(0),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/orders')
  await $allureSubSuite('orders-refunds.service')
  await $allureSeverity('critical')
})

describe('OrdersRefundsService', () => {
  let service: OrdersRefundsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRefundsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: LoyaltyService, useValue: mockLoyaltyService },
      ],
    }).compile()

    service = module.get<OrdersRefundsService>(OrdersRefundsService)

    jest.clearAllMocks()
  })

  // ── refundOrder ───────────────────────────────────────────────────────────

  describe('refundOrder()', () => {
    const refundablePayment = {
      id: 'payment-1',
      stripeId: 'pi_test_123',
      status: 'SUCCEEDED',
    }

    // Real Decimal behaviour matters — arithmetic in refundOrder must produce
    // the same totals the production code computes, so reuse the prod class.
    function buildOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: 'order-1',
        status: OrderStatus.DELIVERED,
        total: new Decimal('100.00'),
        refundAmount: null,
        guestEmail: 'jane@example.com',
        payment: refundablePayment,
        ...overrides,
      }
    }

    it('throws NotFound when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(null)

      await expect(
        service.refundOrder('missing-order', { reason: 'OTHER' as const }),
      ).rejects.toThrow(/not found/i)
    })

    it('throws BadRequest when order has no payment record', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildOrder({ payment: null }))

      await expect(service.refundOrder('order-1', { reason: 'OTHER' as const })).rejects.toThrow(
        /no payment/i,
      )
    })

    it('throws BadRequest when payment status is not SUCCEEDED or PARTIALLY_REFUNDED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(
        buildOrder({ payment: { ...refundablePayment, status: 'PENDING' } }),
      )

      await expect(service.refundOrder('order-1', { reason: 'OTHER' as const })).rejects.toThrow(
        /cannot refund/i,
      )
    })

    it('throws BadRequest when requested amount exceeds remaining refundable', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildOrder())

      await expect(
        service.refundOrder('order-1', { reason: 'OTHER' as const, amount: 150 }),
      ).rejects.toThrow(/exceeds remaining refundable/i)
    })

    it('performs a full refund — sets REFUNDED status, calls Stripe, records history', async () => {
      const order = buildOrder({ guestEmail: 'jane@example.com' })
      mockPrismaService.order.findUnique.mockResolvedValueOnce(order)
      mockStripeService.createRefund.mockResolvedValueOnce({ id: 're_test_full' })
      mockPrismaService.order.update.mockImplementationOnce(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...order, ...data, items: [], statusHistory: [] }),
      )

      const result = await service.refundOrder('order-1', {
        reason: 'ITEM_DAMAGED' as const,
        note: 'Buyer reported broken clasp',
      })

      expect(mockStripeService.createRefund).toHaveBeenCalledWith('pi_test_123', 100)
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'REFUNDED' },
      })
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: OrderStatus.REFUNDED,
            refundReason: 'ITEM_DAMAGED',
            refundNote: 'Buyer reported broken clasp',
            refundAmount: expect.any(Decimal),
            statusHistory: expect.objectContaining({
              create: expect.objectContaining({
                fromStatus: OrderStatus.DELIVERED,
                toStatus: OrderStatus.REFUNDED,
                createdBy: 'admin',
              }),
            }),
          }),
        }),
      )
      // PostHog: full-refund event with reason + isFullRefund=true, keyed by guestEmail
      expect(mockAnalyticsService.trackOrderRefunded).toHaveBeenCalledWith('jane@example.com', {
        orderId: 'order-1',
        refundAmountUsd: 100,
        reason: 'ITEM_DAMAGED',
        isFullRefund: true,
      })
      expect(result.status).toBe(OrderStatus.REFUNDED)
    })

    it('performs a partial refund — sets PARTIALLY_REFUNDED status', async () => {
      const order = buildOrder()
      mockPrismaService.order.findUnique.mockResolvedValueOnce(order)
      mockStripeService.createRefund.mockResolvedValueOnce({ id: 're_test_partial' })
      mockPrismaService.order.update.mockImplementationOnce(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...order, ...data, items: [], statusHistory: [] }),
      )

      const result = await service.refundOrder('order-1', {
        reason: 'CUSTOMER_CHANGED_MIND' as const,
        amount: 40,
      })

      expect(mockStripeService.createRefund).toHaveBeenCalledWith('pi_test_123', 40)
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'PARTIALLY_REFUNDED' },
      })
      expect(mockAnalyticsService.trackOrderRefunded).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ refundAmountUsd: 40, isFullRefund: false }),
      )
      expect(result.status).toBe(OrderStatus.PARTIALLY_REFUNDED)
    })

    it('top-up after PARTIALLY_REFUNDED — cumulative refund reaches total → REFUNDED', async () => {
      const partialOrder = buildOrder({
        status: OrderStatus.PARTIALLY_REFUNDED,
        refundAmount: new Decimal('40.00'),
        payment: { ...refundablePayment, status: 'PARTIALLY_REFUNDED' },
      })
      mockPrismaService.order.findUnique.mockResolvedValueOnce(partialOrder)
      mockStripeService.createRefund.mockResolvedValueOnce({ id: 're_test_topup' })
      mockPrismaService.order.update.mockImplementationOnce(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...partialOrder, ...data, items: [], statusHistory: [] }),
      )

      const result = await service.refundOrder('order-1', {
        reason: 'OTHER' as const,
        amount: 60,
      })

      expect(mockStripeService.createRefund).toHaveBeenCalledWith('pi_test_123', 60)
      expect(result.status).toBe(OrderStatus.REFUNDED)
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'REFUNDED' },
      })
    })

    it('sends refund email but swallows email failure (refund must not be rolled back)', async () => {
      const order = buildOrder()
      mockPrismaService.order.findUnique.mockResolvedValueOnce(order)
      mockStripeService.createRefund.mockResolvedValueOnce({ id: 're_test_email_fail' })
      mockPrismaService.order.update.mockResolvedValueOnce({
        ...order,
        status: OrderStatus.REFUNDED,
        guestEmail: 'jane@example.com',
        items: [],
        statusHistory: [],
      })
      mockEmailService.sendRefundProcessed.mockRejectedValueOnce(new Error('Resend down'))

      await expect(
        service.refundOrder('order-1', { reason: 'OTHER' as const }),
      ).resolves.toBeDefined()

      expect(mockEmailService.sendRefundProcessed).toHaveBeenCalled()
    })
  })

  // ── findAllRefunds ────────────────────────────────────────────────────────

  describe('findAllRefunds()', () => {
    function lastWhereClause(): Record<string, unknown> {
      const call = mockPrismaService.order.findMany.mock.calls.at(-1)?.[0] as
        | { where: Record<string, unknown> }
        | undefined
      return call?.where ?? {}
    }

    it('returns all refunded orders ordered by refundedAt desc when no filters', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds()

      const where = lastWhereClause()
      // AND-array always present so the WHERE composes uniformly with filters
      // tacked on. First leg is the canonical "refunded or partially refunded".
      expect(where).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
        ],
      })
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { refundedAt: 'desc' },
          include: { items: true, payment: true },
        }),
      )
    })

    it('applies the from-date filter to refundedAt', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds({ from: '2026-05-01' })

      expect(lastWhereClause()).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
          { refundedAt: { gte: new Date('2026-05-01') } },
        ],
      })
    })

    it('applies the to-date filter to refundedAt', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds({ to: '2026-05-31' })

      expect(lastWhereClause()).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
          { refundedAt: { lte: new Date('2026-05-31') } },
        ],
      })
    })

    it('applies a single reason filter', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds({ reason: 'ITEM_DAMAGED' })

      expect(lastWhereClause()).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
          { refundReason: 'ITEM_DAMAGED' },
        ],
      })
    })

    it('applies the customer filter as case-insensitive substring on guestEmail OR user.email', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds({ customer: 'alice' })

      expect(lastWhereClause()).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
          {
            OR: [
              { guestEmail: { contains: 'alice', mode: 'insensitive' } },
              { user: { email: { contains: 'alice', mode: 'insensitive' } } },
            ],
          },
        ],
      })
    })

    it('AND-composes all filters when more than one is provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findAllRefunds({
        from: '2026-05-01',
        to: '2026-05-31',
        reason: 'ITEM_DAMAGED',
        customer: 'alice',
      })

      expect(lastWhereClause()).toEqual({
        AND: [
          { OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }] },
          { refundedAt: { gte: new Date('2026-05-01'), lte: new Date('2026-05-31') } },
          { refundReason: 'ITEM_DAMAGED' },
          {
            OR: [
              { guestEmail: { contains: 'alice', mode: 'insensitive' } },
              { user: { email: { contains: 'alice', mode: 'insensitive' } } },
            ],
          },
        ],
      })
    })
  })
})
