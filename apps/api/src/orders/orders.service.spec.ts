import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrdersService } from './orders.service'

const mockShippingAddress = {
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
}

const mockOrderItem = {
  productId: 'prod-1',
  quantity: 2,
  price: 49.99,
  productSnapshot: { title: 'Silver Ring', slug: 'silver-ring' },
}

const mockCreatedOrder = {
  id: 'order-1',
  userId: null,
  status: OrderStatus.PENDING,
  subtotal: 99.98,
  shippingCost: 5.0,
  total: 104.98,
  shippingAddress: mockShippingAddress,
  source: 'web',
  items: [{ id: 'item-1', ...mockOrderItem, orderId: 'order-1' }],
  statusHistory: [
    { id: 'hist-1', orderId: 'order-1', fromStatus: null, toStatus: OrderStatus.PENDING },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

type TransactionCallback = (tx: typeof mockPrismaService) => Promise<unknown>

const mockPrismaService = {
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
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
  sendShippingNotification: jest.fn(),
  sendRefundProcessed: jest.fn(),
}

const mockStripeService = {
  createRefund: jest.fn(),
}

const mockAnalyticsService = {
  trackOrderRefunded: jest.fn(),
  trackOrderCreated: jest.fn(),
  trackPaymentSucceeded: jest.fn(),
}

describe('OrdersService', () => {
  let ordersService: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile()

    ordersService = module.get<OrdersService>(OrdersService)

    jest.clearAllMocks()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates an order with PENDING status and status history entry', async () => {
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder)

      const createOrderDto: CreateOrderDto = {
        items: [mockOrderItem],
        shippingAddress: mockShippingAddress,
        subtotal: 99.98,
        shippingCost: 5.0,
        total: 104.98,
      }

      const order = (await ordersService.create(
        createOrderDto,
      )) as unknown as typeof mockCreatedOrder

      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.statusHistory).toHaveLength(1)
      expect(order.statusHistory[0]?.toStatus).toBe(OrderStatus.PENDING)
    })

    it('creates a guest order when userId is not provided', async () => {
      mockPrismaService.order.create.mockResolvedValue({ ...mockCreatedOrder, userId: null })

      const createOrderDto: CreateOrderDto = {
        items: [mockOrderItem],
        shippingAddress: mockShippingAddress,
        subtotal: 99.98,
        shippingCost: 5.0,
        total: 104.98,
      }

      const order = await ordersService.create(createOrderDto)

      expect(order.userId).toBeNull()
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      )
    })

    it('saves guestEmail when provided', async () => {
      mockPrismaService.order.create.mockResolvedValue({
        ...mockCreatedOrder,
        userId: null,
        guestEmail: 'guest@example.com',
      })

      const createOrderDto: CreateOrderDto = {
        items: [mockOrderItem],
        shippingAddress: mockShippingAddress,
        subtotal: 99.98,
        shippingCost: 5.0,
        total: 104.98,
        guestEmail: 'guest@example.com',
      }

      await ordersService.create(createOrderDto)

      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ guestEmail: 'guest@example.com' }),
        }),
      )
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated orders with meta', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockCreatedOrder])
      mockPrismaService.order.count.mockResolvedValue(1)

      const result = await ordersService.findAll({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalCount).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })

    it('filters by status when status query param is provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.count.mockResolvedValue(0)

      await ordersService.findAll({ status: OrderStatus.PAID })

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.PAID }),
        }),
      )
    })
  })

  // ── findUserOrders ────────────────────────────────────────────────────────

  describe('findUserOrders()', () => {
    it('returns orders for the given userId, newest first, with items', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockCreatedOrder])

      const orders = await ordersService.findUserOrders('user-1')

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
      expect(orders).toEqual([mockCreatedOrder])
    })

    it('returns empty array when user has no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])

      const orders = await ordersService.findUserOrders('user-with-no-orders')

      expect(orders).toEqual([])
    })
  })

  // ── findOneById ───────────────────────────────────────────────────────────

  describe('findOneById()', () => {
    it('returns the order when found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockCreatedOrder)

      const order = await ordersService.findOneById('order-1')

      expect(order.id).toBe('order-1')
    })

    it('throws NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null)

      await expect(ordersService.findOneById('non-existent')).rejects.toThrow(NotFoundException)
    })
  })

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('updates status when the transition is valid', async () => {
      const paidOrder = { ...mockCreatedOrder, status: OrderStatus.PAID }
      mockPrismaService.order.findUnique.mockResolvedValue(paidOrder)
      mockPrismaService.order.update.mockResolvedValue({
        ...paidOrder,
        status: OrderStatus.PROCESSING,
      })

      const updatedOrder = await ordersService.updateStatus('order-1', {
        status: OrderStatus.PROCESSING,
      })

      expect(updatedOrder.status).toBe(OrderStatus.PROCESSING)
    })

    it('throws BadRequestException when the transition is invalid', async () => {
      const shippedOrder = { ...mockCreatedOrder, status: OrderStatus.SHIPPED }
      mockPrismaService.order.findUnique.mockResolvedValue(shippedOrder)

      // SHIPPED → PAID is not an allowed transition
      await expect(
        ordersService.updateStatus('order-1', { status: OrderStatus.PAID }),
      ).rejects.toThrow(BadRequestException)
    })

    it('does not call prisma.update when the transition is invalid', async () => {
      const pendingOrder = { ...mockCreatedOrder, status: OrderStatus.PENDING }
      mockPrismaService.order.findUnique.mockResolvedValue(pendingOrder)

      try {
        await ordersService.updateStatus('order-1', { status: OrderStatus.DELIVERED })
      } catch {
        // expected
      }

      expect(mockPrismaService.order.update).not.toHaveBeenCalled()
    })

    it('sends shipping notification email when transitioning to SHIPPED with guest email', async () => {
      // Valid path: PROCESSING → SHIPPED
      const processingOrder = {
        ...mockCreatedOrder,
        status: OrderStatus.PROCESSING,
        guestEmail: 'guest@example.com',
      }
      const shippedOrder = { ...processingOrder, status: OrderStatus.SHIPPED }
      mockPrismaService.order.findUnique.mockResolvedValue(processingOrder)
      mockPrismaService.order.update.mockResolvedValue(shippedOrder)

      await ordersService.updateStatus('order-1', {
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRK123456',
      })

      expect(mockEmailService.sendShippingNotification).toHaveBeenCalledWith({
        recipientEmail: 'guest@example.com',
        orderId: 'order-1',
        trackingNumber: 'TRK123456',
      })
    })

    it('does not send shipping notification when guestEmail is absent', async () => {
      const processingOrder = {
        ...mockCreatedOrder,
        status: OrderStatus.PROCESSING,
        guestEmail: null,
      }
      const shippedOrder = { ...processingOrder, status: OrderStatus.SHIPPED }
      mockPrismaService.order.findUnique.mockResolvedValue(processingOrder)
      mockPrismaService.order.update.mockResolvedValue(shippedOrder)

      await ordersService.updateStatus('order-1', { status: OrderStatus.SHIPPED })

      expect(mockEmailService.sendShippingNotification).not.toHaveBeenCalled()
    })
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
        ordersService.refundOrder('missing-order', { reason: 'OTHER' as const }),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequest when order has no payment record', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildOrder({ payment: null }))

      await expect(
        ordersService.refundOrder('order-1', { reason: 'OTHER' as const }),
      ).rejects.toThrow(/no payment/i)
    })

    it('throws BadRequest when payment status is not SUCCEEDED or PARTIALLY_REFUNDED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(
        buildOrder({ payment: { ...refundablePayment, status: 'PENDING' } }),
      )

      await expect(
        ordersService.refundOrder('order-1', { reason: 'OTHER' as const }),
      ).rejects.toThrow(/cannot refund/i)
    })

    it('throws BadRequest when requested amount exceeds remaining refundable', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildOrder())

      await expect(
        ordersService.refundOrder('order-1', { reason: 'OTHER' as const, amount: 150 }),
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

      const result = await ordersService.refundOrder('order-1', {
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

      const result = await ordersService.refundOrder('order-1', {
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

      const result = await ordersService.refundOrder('order-1', {
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
        ordersService.refundOrder('order-1', { reason: 'OTHER' as const }),
      ).resolves.toBeDefined()

      expect(mockEmailService.sendRefundProcessed).toHaveBeenCalled()
    })
  })

  // ── findAllRefunds ────────────────────────────────────────────────────────

  describe('findAllRefunds()', () => {
    it('queries orders in REFUNDED or PARTIALLY_REFUNDED status ordered by refundedAt desc', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await ordersService.findAllRefunds()

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ status: OrderStatus.REFUNDED }, { status: OrderStatus.PARTIALLY_REFUNDED }],
        },
        orderBy: { refundedAt: 'desc' },
        include: { items: true, payment: true },
      })
    })
  })

  // ── findProductionQueue ───────────────────────────────────────────────────

  describe('findProductionQueue()', () => {
    function buildOrderWithMto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: 'order-mto-1',
        status: OrderStatus.PAID,
        productionStatus: 'QUEUED',
        productionNotes: null,
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'item-1', product: { stockType: 'MADE_TO_ORDER', productionDays: 5 } }],
        ...overrides,
      }
    }

    it('queries orders in PAID or PROCESSING status with at least one MADE_TO_ORDER item', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await ordersService.findProductionQueue()

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
            items: { some: { product: { stockType: 'MADE_TO_ORDER' } } },
          },
        }),
      )
    })

    it('computes deadline = createdAt + max(productionDays) across MTO items', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        buildOrderWithMto({
          items: [
            { id: 'a', product: { stockType: 'MADE_TO_ORDER', productionDays: 3 } },
            { id: 'b', product: { stockType: 'MADE_TO_ORDER', productionDays: 7 } },
            { id: 'c', product: { stockType: 'IN_STOCK', productionDays: 0 } },
          ],
        }),
      ])

      const result = await ordersService.findProductionQueue()

      // createdAt = 2026-05-10, max productionDays = 7 → deadline = 2026-05-17
      expect(result[0]?.maxProductionDays).toBe(7)
      expect(result[0]?.productionDeadlineAt).toBe(new Date('2026-05-17T00:00:00Z').toISOString())
    })

    it('sorts by deadline ascending — most urgent first', async () => {
      const lessUrgent = buildOrderWithMto({
        id: 'order-late',
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'i', product: { stockType: 'MADE_TO_ORDER', productionDays: 14 } }],
      })
      const moreUrgent = buildOrderWithMto({
        id: 'order-soon',
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'i', product: { stockType: 'MADE_TO_ORDER', productionDays: 1 } }],
      })
      mockPrismaService.order.findMany.mockResolvedValueOnce([lessUrgent, moreUrgent])

      const result = await ordersService.findProductionQueue()

      expect(result.map((order) => order.id)).toEqual(['order-soon', 'order-late'])
    })
  })

  // ── updateProduction ──────────────────────────────────────────────────────

  describe('updateProduction()', () => {
    it('throws NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(null)

      await expect(
        ordersService.updateProduction('missing', { productionStatus: 'IN_PRODUCTION' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('updates productionStatus and productionNotes on a valid transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'QUEUED',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await ordersService.updateProduction('order-1', {
        productionStatus: 'IN_PRODUCTION',
        productionNotes: 'started today',
      })

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { productionStatus: 'IN_PRODUCTION', productionNotes: 'started today' },
        }),
      )
    })

    it('forbids backwards transition (READY_TO_SHIP → QUEUED)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'READY_TO_SHIP',
      })

      await expect(
        ordersService.updateProduction('order-1', { productionStatus: 'QUEUED' }),
      ).rejects.toThrow(/cannot transition production status/i)
      expect(mockPrismaService.order.update).not.toHaveBeenCalled()
    })

    it('allows same-state writes so admin can update notes without changing status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'IN_PRODUCTION',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await ordersService.updateProduction('order-1', {
        productionStatus: 'IN_PRODUCTION',
        productionNotes: 'waiting on garnet shipment',
      })

      expect(mockPrismaService.order.update).toHaveBeenCalled()
    })

    it('allows direct QUEUED → READY_TO_SHIP skip when piece finished immediately', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'QUEUED',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await ordersService.updateProduction('order-1', { productionStatus: 'READY_TO_SHIP' })

      expect(mockPrismaService.order.update).toHaveBeenCalled()
    })
  })
})
