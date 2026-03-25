import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

const mockOrdersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOneById: jest.fn(),
  updateStatus: jest.fn(),
}

const mockCreateOrderDto: CreateOrderDto = {
  items: [
    {
      productId: 'prod-1',
      quantity: 1,
      price: 49.99,
      productSnapshot: { title: 'Silver Ring', slug: 'silver-ring' },
    },
  ],
  shippingAddress: {
    fullName: 'Jane Doe',
    addressLine1: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'US',
  },
  subtotal: 49.99,
  shippingCost: 5.0,
  total: 54.99,
}

const mockOrder = {
  id: 'order-1',
  status: OrderStatus.PENDING,
  total: 54.99,
}

describe('OrdersController', () => {
  let ordersController: OrdersController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile()

    ordersController = module.get<OrdersController>(OrdersController)

    jest.clearAllMocks()
  })

  describe('create()', () => {
    it('delegates to OrdersService.create with the DTO and returns the created order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder)

      const result = await ordersController.create(mockCreateOrderDto)

      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto)
      expect(result).toEqual(mockOrder)
    })
  })

  describe('findAll()', () => {
    it('delegates to OrdersService.findAll with query params', async () => {
      const paginatedResult = {
        data: [mockOrder],
        meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
      }
      mockOrdersService.findAll.mockResolvedValue(paginatedResult)

      const orderQueryDto: OrderQueryDto = { page: 1, limit: 20 }
      const result = await ordersController.findAll(orderQueryDto)

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(orderQueryDto)
      expect(result).toEqual(paginatedResult)
    })
  })

  describe('findOne()', () => {
    it('delegates to OrdersService.findOneById with the id param', async () => {
      mockOrdersService.findOneById.mockResolvedValue(mockOrder)

      const result = await ordersController.findOne('order-1')

      expect(mockOrdersService.findOneById).toHaveBeenCalledWith('order-1')
      expect(result).toEqual(mockOrder)
    })
  })

  describe('updateStatus()', () => {
    it('delegates to OrdersService.updateStatus with id and DTO', async () => {
      const updateOrderStatusDto: UpdateOrderStatusDto = { status: OrderStatus.PAID }
      const updatedOrder = { ...mockOrder, status: OrderStatus.PAID }
      mockOrdersService.updateStatus.mockResolvedValue(updatedOrder)

      const result = await ordersController.updateStatus('order-1', updateOrderStatusDto)

      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', updateOrderStatusDto)
      expect(result).toEqual(updatedOrder)
    })
  })
})
