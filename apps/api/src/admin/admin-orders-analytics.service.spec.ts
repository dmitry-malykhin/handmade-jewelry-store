import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { AdminOrdersAnalyticsService } from './admin-orders-analytics.service'

const mockPrismaService = {
  order: { groupBy: jest.fn() },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/admin')
  await $allureSubSuite('admin-orders-analytics.service')
  await $allureSeverity('normal')
})

describe('AdminOrdersAnalyticsService', () => {
  let service: AdminOrdersAnalyticsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<AdminOrdersAnalyticsService>(AdminOrdersAnalyticsService)
  })

  afterEach(() => jest.resetAllMocks())

  describe('getOrderStatusBreakdown', () => {
    it('returns all 9 known statuses, including those with zero orders', async () => {
      // Backend only reports the non-zero buckets; service must fill the rest.
      mockPrismaService.order.groupBy.mockResolvedValueOnce([
        { status: 'PAID', _count: { status: 3 } },
        { status: 'DELIVERED', _count: { status: 7 } },
      ])

      const result = await service.getOrderStatusBreakdown('30d')

      const byStatus = new Map(result.map((row) => [row.status, row.count]))
      expect(byStatus.get('PAID')).toBe(3)
      expect(byStatus.get('DELIVERED')).toBe(7)
      expect(byStatus.get('PENDING')).toBe(0)
      expect(byStatus.get('REFUNDED')).toBe(0)
      // The chart needs a stable legend — all 9 statuses always present
      expect(result).toHaveLength(9)
    })
  })
})
