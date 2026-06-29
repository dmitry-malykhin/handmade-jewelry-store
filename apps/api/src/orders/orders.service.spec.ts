import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { EmailService } from '../email/email.service'
import { LoyaltyService } from '../loyalty/loyalty.service'
import { PrismaService } from '../prisma/prisma.service'
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
  $transaction: jest.fn(
    (callback: TransactionCallback): Promise<unknown> => callback(mockPrismaService),
  ),
}

const mockEmailService = {
  sendShippingNotification: jest.fn(),
}

const mockLoyaltyService = {
  getBalance: jest.fn().mockResolvedValue({ balance: 0 }),
  awardForDelivered: jest.fn().mockResolvedValue(0),
  reverseForCancellationOrRefund: jest.fn().mockResolvedValue(0),
  spendForCheckout: jest.fn().mockResolvedValue(undefined),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/orders')
  await $allureSubSuite('orders.service')
  await $allureSeverity('normal')
})

describe('OrdersService', () => {
  let ordersService: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: LoyaltyService, useValue: mockLoyaltyService },
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

    it('clamps loyaltyPointsToRedeem against balance and the 50% subtotal cap', async () => {
      mockLoyaltyService.getBalance.mockResolvedValueOnce({ balance: 10000 })
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder)

      // subtotal $100 → 50% cap = 5000 points. Caller asked 8000; balance is 10000 → use 5000.
      const dto: CreateOrderDto = {
        userId: 'user-1',
        items: [mockOrderItem],
        shippingAddress: mockShippingAddress,
        subtotal: 100,
        shippingCost: 5,
        total: 105,
        loyaltyPointsToRedeem: 8000,
      }

      await ordersService.create(dto)

      const callData = mockPrismaService.order.create.mock.calls[0]?.[0] as {
        data: { loyaltyPointsUsed: number; total: number }
      }
      expect(callData.data.loyaltyPointsUsed).toBe(5000)
      // 5000 points = $50 → total = 105 - 50 = 55
      expect(callData.data.total).toBe(55)
    })

    it('spends points via LoyaltyService when redeeming on a registered user', async () => {
      mockLoyaltyService.getBalance.mockResolvedValueOnce({ balance: 5000 })
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder)

      await ordersService.create({
        userId: 'user-1',
        items: [mockOrderItem],
        shippingAddress: mockShippingAddress,
        subtotal: 100,
        shippingCost: 5,
        total: 105,
        loyaltyPointsToRedeem: 2000,
      })

      expect(mockLoyaltyService.spendForCheckout).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        orderId: mockCreatedOrder.id,
        points: 2000,
      })
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

  // ── exportToCsv ───────────────────────────────────────────────────────────

  describe('exportToCsv()', () => {
    function buildOrderForExport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: 'order-1',
        userId: null,
        guestEmail: 'guest@example.com',
        status: OrderStatus.PAID,
        subtotal: new Decimal('99.98'),
        shippingCost: new Decimal('5.00'),
        total: new Decimal('104.98'),
        shippingAddress: {
          fullName: 'Jane Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        trackingNumber: '9400111899223481750000',
        createdAt: new Date('2026-05-19T12:30:00Z'),
        items: [
          { productSnapshot: { title: 'Silver Ring' }, quantity: 2 },
          { productSnapshot: { title: 'Crystal Bracelet' }, quantity: 1 },
        ],
        ...overrides,
      }
    }

    it('returns just the header row when no orders match the filters', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      const csv = await ordersService.exportToCsv({})

      expect(csv).toBe(
        'order_id,date,customer_email,customer_name,shipping_address,items,subtotal,shipping,total,status,tracking_number',
      )
    })

    it('renders monetary fields in USD (not cents) with 2-decimal precision', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([buildOrderForExport()])

      const csv = await ordersService.exportToCsv({})

      // Spreadsheet apps need plain "99.98", not "9998" cents or "99.9800000".
      expect(csv).toContain(',99.98,5.00,104.98,')
    })

    it('renders createdAt as an ISO 8601 string', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([buildOrderForExport()])

      const csv = await ordersService.exportToCsv({})

      expect(csv).toContain('2026-05-19T12:30:00.000Z')
    })

    it('joins line items in a single cell as "Title × qty | Title × qty"', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([buildOrderForExport()])

      const csv = await ordersService.exportToCsv({})

      // The cell contains a `|` (no comma, no quote), so it doesn't need quoting.
      expect(csv).toContain('Silver Ring × 2 | Crystal Bracelet × 1')
    })

    it('forwards status + date filters to Prisma', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await ordersService.exportToCsv({
        status: OrderStatus.PAID,
        from: '2026-05-01',
        to: '2026-05-31',
      })

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: OrderStatus.PAID,
            createdAt: {
              gte: new Date('2026-05-01'),
              lte: new Date('2026-05-31'),
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      )
    })

    it('escapes commas in the shipping address so CSV stays valid', async () => {
      // Comma in the rendered address ("123 Main St, New York NY 10001, US") must
      // not split the row into extra columns when opened in Excel.
      mockPrismaService.order.findMany.mockResolvedValueOnce([buildOrderForExport()])

      const csv = await ordersService.exportToCsv({})

      expect(csv).toContain('"123 Main St, New York NY 10001, US"')
    })

    it('falls back to userId in the email column when guestEmail is null', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        buildOrderForExport({ guestEmail: null, userId: 'user-42' }),
      ])

      const csv = await ordersService.exportToCsv({})

      // user-42 should appear in the email column (third field).
      expect(csv.split('\r\n')[1]?.split(',')[2]).toBe('user-42')
    })
  })
})
