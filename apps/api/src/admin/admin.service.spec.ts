import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { AdminService } from './admin.service'

const mockPrismaService = {
  product: { count: jest.fn() },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/admin')
  await $allureSubSuite('admin.service')
  await $allureSeverity('normal')
})

describe('AdminService', () => {
  let adminService: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    adminService = module.get<AdminService>(AdminService)
  })

  afterEach(() => jest.resetAllMocks())

  describe('getStats', () => {
    it('returns productCount, orderCount and calculated totalRevenueCents', async () => {
      mockPrismaService.product.count.mockResolvedValue(12)
      mockPrismaService.order.count.mockResolvedValue(7)
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: '125.50' } })

      const adminStats = await adminService.getStats()

      expect(adminStats).toEqual({
        productCount: 12,
        orderCount: 7,
        totalRevenueCents: 12550,
      })
    })

    it('returns totalRevenueCents as 0 when no revenue orders exist', async () => {
      mockPrismaService.product.count.mockResolvedValue(5)
      mockPrismaService.order.count.mockResolvedValue(3)
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: null } })

      const adminStats = await adminService.getStats()

      expect(adminStats.totalRevenueCents).toBe(0)
    })

    it('returns zero counts when database is empty', async () => {
      mockPrismaService.product.count.mockResolvedValue(0)
      mockPrismaService.order.count.mockResolvedValue(0)
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: null } })

      const adminStats = await adminService.getStats()

      expect(adminStats.productCount).toBe(0)
      expect(adminStats.orderCount).toBe(0)
      expect(adminStats.totalRevenueCents).toBe(0)
    })

    it('propagates Prisma error when database query fails', async () => {
      mockPrismaService.product.count.mockRejectedValue(new Error('DB connection failed'))
      mockPrismaService.order.count.mockResolvedValue(0)
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: null } })

      await expect(adminService.getStats()).rejects.toThrow('DB connection failed')
    })
  })
})
