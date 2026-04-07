import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrismaService = {
  product: { count: jest.fn() },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
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

  describe('getRevenueStats', () => {
    it('returns empty chart data with zeros when no orders exist', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])

      const result = await adminService.getRevenueStats('7d')

      expect(result.totalRevenueCents).toBe(0)
      expect(result.orderCount).toBe(0)
      expect(result.avgOrderValueCents).toBe(0)
      expect(result.chartData).toHaveLength(7)
      expect(result.chartData.every((point) => point.revenueCents === 0)).toBe(true)
    })

    it('aggregates order totals into daily buckets for 7d period', async () => {
      const today = new Date()
      today.setHours(12, 0, 0, 0)

      mockPrismaService.order.findMany.mockResolvedValue([
        { total: '50.00', createdAt: today },
        { total: '25.00', createdAt: today },
      ])

      const result = await adminService.getRevenueStats('7d')

      expect(result.totalRevenueCents).toBe(7500)
      expect(result.orderCount).toBe(2)
      expect(result.avgOrderValueCents).toBe(3750)
      expect(result.chartData).toHaveLength(7)

      const todayKey = today.toISOString().slice(0, 10)
      const todayBucket = result.chartData.find((point) => point.date === todayKey)
      expect(todayBucket?.revenueCents).toBe(7500)
    })

    it('groups data by month for 1y period', async () => {
      const date = new Date()
      date.setHours(12, 0, 0, 0)

      mockPrismaService.order.findMany.mockResolvedValue([{ total: '100.00', createdAt: date }])

      const result = await adminService.getRevenueStats('1y')

      expect(result.totalRevenueCents).toBe(10000)
      // 1y period groups by month — should have ~13 buckets (from start month to current month)
      expect(result.chartData.length).toBeGreaterThanOrEqual(12)
      expect(result.chartData.length).toBeLessThanOrEqual(13)
    })

    it('returns correct number of data points for each period', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])

      const result7d = await adminService.getRevenueStats('7d')
      const result30d = await adminService.getRevenueStats('30d')
      const result90d = await adminService.getRevenueStats('90d')

      expect(result7d.chartData).toHaveLength(7)
      expect(result30d.chartData).toHaveLength(30)
      expect(result90d.chartData).toHaveLength(90)
    })
  })
})
