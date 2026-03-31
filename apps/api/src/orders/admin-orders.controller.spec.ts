import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { AdminOrdersController } from './admin-orders.controller'
import { OrdersService } from './orders.service'
import { OrderQueryDto } from './dto/order-query.dto'

const mockOrderSummary = {
  id: 'order-uuid-1',
  status: OrderStatus.PENDING,
  guestEmail: 'buyer@example.com',
  subtotal: 6800,
  shippingCost: 500,
  total: 7300,
  shippingAddress: {},
  items: [{ id: 'item-1', productId: 'prod-1', quantity: 1, price: 6800, productSnapshot: {} }],
  createdAt: new Date().toISOString(),
}

const mockOrdersService = {
  findAll: jest.fn(),
  findOneById: jest.fn(),
  updateStatus: jest.fn(),
}

describe('AdminOrdersController', () => {
  let adminOrdersController: AdminOrdersController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile()

    adminOrdersController = module.get<AdminOrdersController>(AdminOrdersController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns paginated orders list from service', async () => {
      const paginatedResponse = {
        data: [mockOrderSummary],
        meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
      }
      mockOrdersService.findAll.mockResolvedValue(paginatedResponse)

      const orderQueryDto: OrderQueryDto = { page: 1, limit: 20 }
      const result = await adminOrdersController.findAll(orderQueryDto)

      expect(result).toEqual(paginatedResponse)
      expect(mockOrdersService.findAll).toHaveBeenCalledWith(orderQueryDto)
    })

    it('passes status filter to service when provided', async () => {
      mockOrdersService.findAll.mockResolvedValue({ data: [], meta: { totalCount: 0 } })

      const orderQueryDto: OrderQueryDto = { status: OrderStatus.SHIPPED }
      await adminOrdersController.findAll(orderQueryDto)

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.SHIPPED }),
      )
    })

    it('propagates service error when findAll throws', async () => {
      mockOrdersService.findAll.mockRejectedValue(new Error('Database unavailable'))

      await expect(adminOrdersController.findAll({})).rejects.toThrow('Database unavailable')
    })
  })

  describe('findOne', () => {
    it('returns single order by id', async () => {
      mockOrdersService.findOneById.mockResolvedValue(mockOrderSummary)

      const result = await adminOrdersController.findOne('order-uuid-1')

      expect(result).toEqual(mockOrderSummary)
      expect(mockOrdersService.findOneById).toHaveBeenCalledWith('order-uuid-1')
    })

    it('propagates NotFoundException when order id does not exist', async () => {
      mockOrdersService.findOneById.mockRejectedValue(new Error('Order not found'))

      await expect(adminOrdersController.findOne('nonexistent-id')).rejects.toThrow(
        'Order not found',
      )
    })
  })

  describe('updateStatus', () => {
    it('updates order status and returns updated order', async () => {
      const updatedOrder = { ...mockOrderSummary, status: OrderStatus.PAID }
      mockOrdersService.updateStatus.mockResolvedValue(updatedOrder)

      const result = await adminOrdersController.updateStatus('order-uuid-1', {
        status: OrderStatus.PAID,
      })

      expect(result).toEqual(updatedOrder)
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-uuid-1', {
        status: OrderStatus.PAID,
      })
    })

    it('propagates BadRequestException when status transition is invalid', async () => {
      mockOrdersService.updateStatus.mockRejectedValue(
        new Error('Invalid status transition: DELIVERED → PENDING'),
      )

      await expect(
        adminOrdersController.updateStatus('order-uuid-1', { status: OrderStatus.PENDING }),
      ).rejects.toThrow('Invalid status transition')
    })
  })
})
