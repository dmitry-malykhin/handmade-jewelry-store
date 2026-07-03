import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { AdminRevenueService } from './admin-revenue.service'

const mockPrismaService = {
  order: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/admin')
  await $allureSubSuite('admin-revenue.service')
  await $allureSeverity('normal')
})

describe('AdminRevenueService', () => {
  let service: AdminRevenueService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminRevenueService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    service = module.get<AdminRevenueService>(AdminRevenueService)
  })

  afterEach(() => jest.resetAllMocks())

  describe('getRevenueStats', () => {
    it('returns empty chart data with zeros when no orders exist', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])

      const result = await service.getRevenueStats('7d')

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

      const result = await service.getRevenueStats('7d')

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

      const result = await service.getRevenueStats('1y')

      expect(result.totalRevenueCents).toBe(10000)
      // 1y period groups by month — should have ~13 buckets (from start month to current month)
      expect(result.chartData.length).toBeGreaterThanOrEqual(12)
      expect(result.chartData.length).toBeLessThanOrEqual(13)
    })

    it('returns correct number of data points for each period', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([])

      const result7d = await service.getRevenueStats('7d')
      const result30d = await service.getRevenueStats('30d')
      const result90d = await service.getRevenueStats('90d')

      expect(result7d.chartData).toHaveLength(7)
      expect(result30d.chartData).toHaveLength(30)
      expect(result90d.chartData).toHaveLength(90)
    })
  })

  describe('getKeyMetrics', () => {
    it('returns zeros across the board for an empty period', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      const result = await service.getKeyMetrics('30d')

      expect(result).toEqual({
        newCustomers: 0,
        returningCustomers: 0,
        refundRatePercent: 0,
        avgDaysOrderToDelivery: 0,
      })
    })

    it('computes refundRatePercent = refunded / paid × 100, rounded', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        { id: 'o1', userId: null, status: 'DELIVERED', createdAt: new Date(), deliveredAt: null },
        { id: 'o2', userId: null, status: 'DELIVERED', createdAt: new Date(), deliveredAt: null },
        { id: 'o3', userId: null, status: 'DELIVERED', createdAt: new Date(), deliveredAt: null },
        { id: 'o4', userId: null, status: 'DELIVERED', createdAt: new Date(), deliveredAt: null },
        // 1 refunded out of 4 paid → 25%
        { id: 'o5', userId: null, status: 'REFUNDED', createdAt: new Date(), deliveredAt: null },
      ])
      mockPrismaService.order.groupBy.mockResolvedValueOnce([])

      const result = await service.getKeyMetrics('30d')

      expect(result.refundRatePercent).toBe(25)
    })

    it('splits new vs returning customers by first paid order timestamp', async () => {
      const nowDate = new Date()
      const yearAgo = new Date(nowDate)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)

      mockPrismaService.order.findMany.mockResolvedValueOnce([
        { id: 'o1', userId: 'u-new', status: 'DELIVERED', createdAt: nowDate, deliveredAt: null },
        { id: 'o2', userId: 'u-returning', status: 'PAID', createdAt: nowDate, deliveredAt: null },
      ])
      mockPrismaService.order.groupBy.mockResolvedValueOnce([
        // u-new's first ever paid order is inside the period (now).
        { userId: 'u-new', _min: { createdAt: nowDate } },
        // u-returning placed their first paid order long before the period.
        { userId: 'u-returning', _min: { createdAt: yearAgo } },
      ])

      const result = await service.getKeyMetrics('30d')

      expect(result.newCustomers).toBe(1)
      expect(result.returningCustomers).toBe(1)
    })

    it('averages deliveredAt − createdAt across DELIVERED orders, in days', async () => {
      const day0 = new Date('2026-05-01T00:00:00Z')
      const day3 = new Date('2026-05-04T00:00:00Z')
      const day7 = new Date('2026-05-08T00:00:00Z')
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        { id: 'o1', userId: null, status: 'DELIVERED', createdAt: day0, deliveredAt: day3 },
        { id: 'o2', userId: null, status: 'DELIVERED', createdAt: day0, deliveredAt: day7 },
      ])
      mockPrismaService.order.groupBy.mockResolvedValueOnce([])

      const result = await service.getKeyMetrics('30d')

      // (3 + 7) / 2 = 5 days
      expect(result.avgDaysOrderToDelivery).toBe(5)
    })
  })
})
