import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DiscountType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { DiscountsService, computeDiscountAmountCents } from './discounts.service'

const mockPrismaService = {
  discount: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

function buildDiscount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'disc-1',
    code: 'WELCOME10',
    type: DiscountType.PERCENTAGE,
    value: 10,
    minOrderCents: 0,
    maxUsages: null,
    usageCount: 0,
    expiresAt: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('DiscountsService', () => {
  let discountsService: DiscountsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscountsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()
    discountsService = module.get<DiscountsService>(DiscountsService)
  })

  // ── computeDiscountAmountCents helper ────────────────────────────────────

  describe('computeDiscountAmountCents()', () => {
    it('applies percentage as floor((subtotal * value) / 100)', () => {
      expect(computeDiscountAmountCents(DiscountType.PERCENTAGE, 10, 5000)).toBe(500)
      // 12.5% of 4999 cents = 624.875 → floor = 624
      expect(computeDiscountAmountCents(DiscountType.PERCENTAGE, 12, 5199)).toBe(623)
    })

    it('caps percentage discount at subtotal (100% off cannot exceed cart)', () => {
      expect(computeDiscountAmountCents(DiscountType.PERCENTAGE, 100, 5000)).toBe(5000)
    })

    it('returns FIXED_AMOUNT cents directly when ≤ subtotal', () => {
      expect(computeDiscountAmountCents(DiscountType.FIXED_AMOUNT, 1000, 5000)).toBe(1000)
    })

    it('caps FIXED_AMOUNT discount at subtotal — never reduces cart below 0', () => {
      expect(computeDiscountAmountCents(DiscountType.FIXED_AMOUNT, 10000, 5000)).toBe(5000)
    })
  })

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('normalises the code to UPPERCASE before persisting', async () => {
      mockPrismaService.discount.create.mockResolvedValueOnce(buildDiscount())

      await discountsService.create({ code: 'welcome10', type: DiscountType.PERCENTAGE, value: 10 })

      expect(mockPrismaService.discount.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'WELCOME10' }) }),
      )
    })

    it('rejects PERCENTAGE value outside 1-100', async () => {
      await expect(
        discountsService.create({ code: 'OVER', type: DiscountType.PERCENTAGE, value: 150 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('translates Prisma P2002 unique-code violation to 409 ConflictException', async () => {
      mockPrismaService.discount.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        }),
      )

      await expect(
        discountsService.create({ code: 'DUPE', type: DiscountType.PERCENTAGE, value: 10 }),
      ).rejects.toThrow(ConflictException)
    })
  })

  // ── findOneById / soft delete ────────────────────────────────────────────

  describe('findOneById()', () => {
    it('throws NotFound when discount is soft-deleted', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ deletedAt: new Date() }),
      )

      await expect(discountsService.findOneById('disc-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll()', () => {
    it('filters out soft-deleted rows', async () => {
      mockPrismaService.discount.findMany.mockResolvedValueOnce([])

      await discountsService.findAll()

      expect(mockPrismaService.discount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      )
    })
  })

  describe('remove()', () => {
    it('marks deletedAt instead of hard delete (preserves order history)', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(buildDiscount())
      mockPrismaService.discount.update.mockResolvedValueOnce(buildDiscount())

      await discountsService.remove('disc-1')

      expect(mockPrismaService.discount.update).toHaveBeenCalledWith({
        where: { id: 'disc-1' },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })

  // ── validate ─────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('throws NotFound for unknown codes', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(null)

      await expect(discountsService.validate({ code: 'NOPE' })).rejects.toThrow(NotFoundException)
    })

    it('rejects inactive codes', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ isActive: false }),
      )

      await expect(discountsService.validate({ code: 'WELCOME10' })).rejects.toThrow(/not active/i)
    })

    it('rejects expired codes', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
      )

      await expect(discountsService.validate({ code: 'WELCOME10' })).rejects.toThrow(/expired/i)
    })

    it('rejects codes that have reached their usage cap', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ maxUsages: 10, usageCount: 10 }),
      )

      await expect(discountsService.validate({ code: 'WELCOME10' })).rejects.toThrow(/usage limit/i)
    })

    it('rejects when subtotal is below minOrderCents', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ minOrderCents: 5000 }),
      )

      await expect(
        discountsService.validate({ code: 'WELCOME10', subtotalCents: 1000 }),
      ).rejects.toThrow(/minimum order/i)
    })

    it('returns the computed discount amount for a valid code', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(
        buildDiscount({ type: DiscountType.PERCENTAGE, value: 10 }),
      )

      const result = await discountsService.validate({
        code: 'welcome10',
        subtotalCents: 5000,
      })

      expect(result.discountAmountCents).toBe(500)
      expect(result.code).toBe('WELCOME10')
    })

    it('normalises the lookup code to UPPERCASE — accepts lowercase input', async () => {
      mockPrismaService.discount.findUnique.mockResolvedValueOnce(buildDiscount())

      await discountsService.validate({ code: 'welcome10' })

      expect(mockPrismaService.discount.findUnique).toHaveBeenCalledWith({
        where: { code: 'WELCOME10' },
      })
    })
  })

  // ── incrementUsage ───────────────────────────────────────────────────────

  describe('incrementUsage()', () => {
    it('atomically increments usageCount by 1', async () => {
      mockPrismaService.discount.update.mockResolvedValueOnce(buildDiscount({ usageCount: 1 }))

      await discountsService.incrementUsage('disc-1')

      expect(mockPrismaService.discount.update).toHaveBeenCalledWith({
        where: { id: 'disc-1' },
        data: { usageCount: { increment: 1 } },
      })
    })
  })
})
