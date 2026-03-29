import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrismaService = {
  product: { count: jest.fn() },
  order: { count: jest.fn() },
}

describe('AdminService', () => {
  let adminService: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    adminService = module.get<AdminService>(AdminService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('getStats', () => {
    it('returns productCount and orderCount from Prisma', async () => {
      mockPrismaService.product.count.mockResolvedValue(12)
      mockPrismaService.order.count.mockResolvedValue(7)

      const adminStats = await adminService.getStats()

      expect(adminStats).toEqual({
        productCount: 12,
        orderCount: 7,
        totalRevenueCents: 0,
      })
    })

    it('returns zero counts when database is empty', async () => {
      mockPrismaService.product.count.mockResolvedValue(0)
      mockPrismaService.order.count.mockResolvedValue(0)

      const adminStats = await adminService.getStats()

      expect(adminStats.productCount).toBe(0)
      expect(adminStats.orderCount).toBe(0)
      expect(adminStats.totalRevenueCents).toBe(0)
    })

    it('propagates Prisma error when database query fails', async () => {
      mockPrismaService.product.count.mockRejectedValue(new Error('DB connection failed'))
      mockPrismaService.order.count.mockResolvedValue(0)

      await expect(adminService.getStats()).rejects.toThrow('DB connection failed')
    })

    it('always returns totalRevenueCents as 0 regardless of order count', async () => {
      mockPrismaService.product.count.mockResolvedValue(100)
      mockPrismaService.order.count.mockResolvedValue(500)

      const adminStats = await adminService.getStats()

      expect(adminStats.totalRevenueCents).toBe(0)
    })
  })
})
