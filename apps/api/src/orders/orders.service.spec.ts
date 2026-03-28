import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { EmailService } from '../email/email.service'
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

const mockPrismaService = {
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const mockEmailService = {
  sendShippingNotification: jest.fn(),
}

describe('OrdersService', () => {
  let ordersService: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
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
})
