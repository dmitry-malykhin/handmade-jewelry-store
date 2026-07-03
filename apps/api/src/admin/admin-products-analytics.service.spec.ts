import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { AdminProductsAnalyticsService } from './admin-products-analytics.service'

const mockPrismaService = {
  product: { findMany: jest.fn() },
  orderItem: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/admin')
  await $allureSubSuite('admin-products-analytics.service')
  await $allureSeverity('normal')
})

describe('AdminProductsAnalyticsService', () => {
  let service: AdminProductsAnalyticsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProductsAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<AdminProductsAnalyticsService>(AdminProductsAnalyticsService)
  })

  afterEach(() => jest.resetAllMocks())

  describe('getTopProducts', () => {
    it('returns an empty array when there are no orders in the period', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValueOnce([])

      const result = await service.getTopProducts('30d', 10)

      expect(result).toEqual([])
      // No follow-up queries when there's nothing to enrich
      expect(mockPrismaService.orderItem.findMany).not.toHaveBeenCalled()
    })

    it('ranks products by revenue desc and respects the limit', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValueOnce([
        { productId: 'p1', _sum: { quantity: 3 } },
        { productId: 'p2', _sum: { quantity: 1 } },
        { productId: 'p3', _sum: { quantity: 2 } },
      ])
      mockPrismaService.orderItem.findMany.mockResolvedValueOnce([
        // p1: 3 × $20 = $60
        { productId: 'p1', price: 20, quantity: 3 },
        // p2: 1 × $150 = $150
        { productId: 'p2', price: 150, quantity: 1 },
        // p3: 2 × $30 = $60
        { productId: 'p3', price: 30, quantity: 2 },
      ])
      mockPrismaService.product.findMany.mockResolvedValueOnce([
        { id: 'p1', slug: 'p1', title: 'P1', images: ['p1.jpg'], avgRating: 4, reviewCount: 5 },
        { id: 'p2', slug: 'p2', title: 'P2', images: [], avgRating: 5, reviewCount: 2 },
        { id: 'p3', slug: 'p3', title: 'P3', images: ['p3.jpg'], avgRating: 3, reviewCount: 1 },
      ])

      const result = await service.getTopProducts('30d', 2)

      // Sorted by revenue desc → p2 ($150), then either p1 or p3 (both $60).
      expect(result).toHaveLength(2)
      expect(result[0]?.productId).toBe('p2')
      expect(result[0]?.revenueCents).toBe(15000)
      expect(result[0]?.image).toBeNull()
    })

    it('skips aggregate rows whose product was deleted', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValueOnce([
        { productId: 'still-exists', _sum: { quantity: 1 } },
        { productId: 'deleted', _sum: { quantity: 5 } },
      ])
      mockPrismaService.orderItem.findMany.mockResolvedValueOnce([
        { productId: 'still-exists', price: 10, quantity: 1 },
        { productId: 'deleted', price: 99, quantity: 5 },
      ])
      mockPrismaService.product.findMany.mockResolvedValueOnce([
        {
          id: 'still-exists',
          slug: 'still-exists',
          title: 'Live',
          images: [],
          avgRating: 0,
          reviewCount: 0,
        },
      ])

      const result = await service.getTopProducts('30d', 10)

      expect(result).toHaveLength(1)
      expect(result[0]?.productId).toBe('still-exists')
    })
  })
})
