import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { OrdersProductionService } from './orders-production.service'

const mockPrismaService = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/orders')
  await $allureSubSuite('orders-production.service')
  await $allureSeverity('normal')
})

describe('OrdersProductionService', () => {
  let service: OrdersProductionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersProductionService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    service = module.get<OrdersProductionService>(OrdersProductionService)

    jest.clearAllMocks()
  })

  // ── findProductionQueue ───────────────────────────────────────────────────

  describe('findProductionQueue()', () => {
    function buildOrderWithMto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: 'order-mto-1',
        status: OrderStatus.PAID,
        productionStatus: 'QUEUED',
        productionNotes: null,
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'item-1', product: { stockType: 'MADE_TO_ORDER', productionDays: 5 } }],
        ...overrides,
      }
    }

    it('queries orders in PAID or PROCESSING status with at least one MADE_TO_ORDER item', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([])

      await service.findProductionQueue()

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
            items: { some: { product: { stockType: 'MADE_TO_ORDER' } } },
          },
        }),
      )
    })

    it('computes deadline = createdAt + max(productionDays) across MTO items', async () => {
      mockPrismaService.order.findMany.mockResolvedValueOnce([
        buildOrderWithMto({
          items: [
            { id: 'a', product: { stockType: 'MADE_TO_ORDER', productionDays: 3 } },
            { id: 'b', product: { stockType: 'MADE_TO_ORDER', productionDays: 7 } },
            { id: 'c', product: { stockType: 'IN_STOCK', productionDays: 0 } },
          ],
        }),
      ])

      const result = await service.findProductionQueue()

      // createdAt = 2026-05-10, max productionDays = 7 → deadline = 2026-05-17
      expect(result[0]?.maxProductionDays).toBe(7)
      expect(result[0]?.productionDeadlineAt).toBe(new Date('2026-05-17T00:00:00Z').toISOString())
    })

    it('sorts by deadline ascending — most urgent first', async () => {
      const lessUrgent = buildOrderWithMto({
        id: 'order-late',
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'i', product: { stockType: 'MADE_TO_ORDER', productionDays: 14 } }],
      })
      const moreUrgent = buildOrderWithMto({
        id: 'order-soon',
        createdAt: new Date('2026-05-10T00:00:00Z'),
        items: [{ id: 'i', product: { stockType: 'MADE_TO_ORDER', productionDays: 1 } }],
      })
      mockPrismaService.order.findMany.mockResolvedValueOnce([lessUrgent, moreUrgent])

      const result = await service.findProductionQueue()

      expect(result.map((order) => order.id)).toEqual(['order-soon', 'order-late'])
    })
  })

  // ── updateProduction ──────────────────────────────────────────────────────

  describe('updateProduction()', () => {
    it('throws NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(null)

      await expect(
        service.updateProduction('missing', { productionStatus: 'IN_PRODUCTION' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('updates productionStatus and productionNotes on a valid transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'QUEUED',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await service.updateProduction('order-1', {
        productionStatus: 'IN_PRODUCTION',
        productionNotes: 'started today',
      })

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { productionStatus: 'IN_PRODUCTION', productionNotes: 'started today' },
        }),
      )
    })

    it('forbids backwards transition (READY_TO_SHIP → QUEUED)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'READY_TO_SHIP',
      })

      await expect(
        service.updateProduction('order-1', { productionStatus: 'QUEUED' }),
      ).rejects.toThrow(/cannot transition production status/i)
      expect(mockPrismaService.order.update).not.toHaveBeenCalled()
    })

    it('allows same-state writes so admin can update notes without changing status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'IN_PRODUCTION',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await service.updateProduction('order-1', {
        productionStatus: 'IN_PRODUCTION',
        productionNotes: 'waiting on garnet shipment',
      })

      expect(mockPrismaService.order.update).toHaveBeenCalled()
    })

    it('allows direct QUEUED → READY_TO_SHIP skip when piece finished immediately', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        productionStatus: 'QUEUED',
      })
      mockPrismaService.order.update.mockResolvedValueOnce({})

      await service.updateProduction('order-1', { productionStatus: 'READY_TO_SHIP' })

      expect(mockPrismaService.order.update).toHaveBeenCalled()
    })
  })
})
