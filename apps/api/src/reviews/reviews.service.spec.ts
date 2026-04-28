import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ReviewsService } from './reviews.service'

const mockPrismaService = {
  product: { findUnique: jest.fn(), update: jest.fn() },
  orderItem: { findFirst: jest.fn() },
  review: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
}

const sampleProduct = {
  id: 'prod-1',
  slug: 'beaded-bracelet',
  avgRating: 4.5,
  reviewCount: 2,
}

describe('ReviewsService', () => {
  let reviewsService: ReviewsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    reviewsService = module.get<ReviewsService>(ReviewsService)
  })

  describe('createReview', () => {
    const validDto = { productId: 'prod-1', rating: 5, comment: 'Beautiful!' }

    it('throws NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(reviewsService.createReview('user-1', validDto)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws ForbiddenException when user has not purchased the product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null)

      await expect(reviewsService.createReview('user-1', validDto)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('creates review and recalculates Product avgRating + reviewCount', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })

      const txMock = {
        review: {
          create: jest.fn().mockResolvedValue({ id: 'review-1' }),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.7 }, _count: 3 }),
        },
        product: { update: jest.fn() },
      }
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMock))

      await reviewsService.createReview('user-1', validDto)

      expect(txMock.review.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', productId: 'prod-1', rating: 5, comment: 'Beautiful!' },
      })
      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { avgRating: 4.7, reviewCount: 3 },
      })
    })

    it('throws ConflictException on duplicate review (P2002)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
      mockPrismaService.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
        }),
      )

      await expect(reviewsService.createReview('user-1', validDto)).rejects.toThrow(
        ConflictException,
      )
    })

    it('only allows reviews for DELIVERED orders', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback({
          review: {
            create: jest.fn().mockResolvedValue({ id: 'review-1' }),
            aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: 1 }),
          },
          product: { update: jest.fn() },
        }),
      )

      await reviewsService.createReview('user-1', validDto)

      expect(mockPrismaService.orderItem.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          order: { userId: 'user-1', status: { in: [OrderStatus.DELIVERED] } },
        },
        select: { id: true },
      })
    })
  })

  describe('findReviewsForProduct', () => {
    it('throws NotFoundException when product slug does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(reviewsService.findReviewsForProduct('missing', {})).rejects.toThrow(
        NotFoundException,
      )
    })

    it('returns paginated reviews with masked author names', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          comment: 'Great',
          createdAt: new Date('2026-04-20'),
          user: { email: 'jane.doe@example.com' },
        },
      ])

      const result = await reviewsService.findReviewsForProduct('beaded-bracelet', {
        page: 1,
        limit: 10,
      })

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'r1',
          rating: 5,
          comment: 'Great',
          displayName: 'Jane.',
        }),
      )
      expect(result.meta.totalCount).toBe(2)
      expect(result.meta.avgRating).toBe(4.5)
    })

    it('does not leak full user emails in response', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(sampleProduct)
      mockPrismaService.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 4,
          comment: null,
          createdAt: new Date(),
          user: { email: 'secret@example.com' },
        },
      ])

      const result = await reviewsService.findReviewsForProduct('beaded-bracelet', {})

      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain('secret@example.com')
    })
  })

  describe('checkReviewEligibility', () => {
    it('throws BadRequestException when productId is missing', async () => {
      await expect(reviewsService.checkReviewEligibility('user-1', '')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('returns canReview=true when user has a delivered order and no existing review', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
      mockPrismaService.review.findUnique.mockResolvedValue(null)

      const result = await reviewsService.checkReviewEligibility('user-1', 'prod-1')

      expect(result).toEqual({ hasPurchased: true, hasReviewed: false, canReview: true })
    })

    it('returns canReview=false when user has not purchased', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null)
      mockPrismaService.review.findUnique.mockResolvedValue(null)

      const result = await reviewsService.checkReviewEligibility('user-1', 'prod-1')

      expect(result).toEqual({ hasPurchased: false, hasReviewed: false, canReview: false })
    })

    it('returns canReview=false when user has already reviewed', async () => {
      mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
      mockPrismaService.review.findUnique.mockResolvedValue({ id: 'review-1' })

      const result = await reviewsService.checkReviewEligibility('user-1', 'prod-1')

      expect(result).toEqual({ hasPurchased: true, hasReviewed: true, canReview: false })
    })
  })
})
