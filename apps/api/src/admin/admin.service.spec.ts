import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../prisma/prisma.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockPrismaService = {
  product: { count: jest.fn(), findMany: jest.fn() },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  orderItem: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
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

  // resetAllMocks (not clearAllMocks) — clears any queued mockResolvedValueOnce
  // values that the previous test set up but never consumed.
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

  // ── getTopProducts ────────────────────────────────────────────────────────

  describe('getTopProducts', () => {
    it('returns an empty array when there are no orders in the period', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValueOnce([])

      const result = await adminService.getTopProducts('30d', 10)

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

      const result = await adminService.getTopProducts('30d', 2)

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

      const result = await adminService.getTopProducts('30d', 10)

      expect(result).toHaveLength(1)
      expect(result[0]?.productId).toBe('still-exists')
    })
  })

  // ── getOrderStatusBreakdown ───────────────────────────────────────────────

  describe('getOrderStatusBreakdown', () => {
    it('returns all known statuses, including those with zero orders', async () => {
      // Backend only reports the non-zero buckets; service must fill the rest.
      mockPrismaService.order.groupBy.mockResolvedValueOnce([
        { status: 'PAID', _count: { status: 3 } },
        { status: 'DELIVERED', _count: { status: 7 } },
      ])

      const result = await adminService.getOrderStatusBreakdown('30d')

      const byStatus = new Map(result.map((row) => [row.status, row.count]))
      expect(byStatus.get('PAID')).toBe(3)
      expect(byStatus.get('DELIVERED')).toBe(7)
      expect(byStatus.get('PENDING')).toBe(0)
      expect(byStatus.get('REFUNDED')).toBe(0)
      // The chart needs a stable legend — all 8 statuses always present
      expect(result).toHaveLength(8)
    })
  })

  // ── getKeyMetrics ─────────────────────────────────────────────────────────

  describe('getKeyMetrics', () => {
    it('returns zeros across the board for an empty period', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      const result = await adminService.getKeyMetrics('30d')

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

      const result = await adminService.getKeyMetrics('30d')

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

      const result = await adminService.getKeyMetrics('30d')

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

      const result = await adminService.getKeyMetrics('30d')

      // (3 + 7) / 2 = 5 days
      expect(result.avgDaysOrderToDelivery).toBe(5)
    })
  })
})
