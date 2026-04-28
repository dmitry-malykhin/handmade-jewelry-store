import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { OrderStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'

const REVIEWABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED]

@Injectable()
export class ReviewsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const product = await this.prismaService.product.findUnique({
      where: { id: dto.productId },
    })
    if (!product) {
      throw new NotFoundException(`Product with id "${dto.productId}" not found`)
    }

    // Verified-purchase guard: user must have a delivered order containing this product
    const hasPurchased = await this.prismaService.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: { in: REVIEWABLE_STATUSES } },
      },
      select: { id: true },
    })
    if (!hasPurchased) {
      throw new ForbiddenException('You can only review products you have purchased')
    }

    try {
      // Atomic: create review + recalculate Product avgRating and reviewCount
      const review = await this.prismaService.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            userId,
            productId: dto.productId,
            rating: dto.rating,
            comment: dto.comment,
          },
        })

        const aggregate = await tx.review.aggregate({
          where: { productId: dto.productId },
          _avg: { rating: true },
          _count: true,
        })

        await tx.product.update({
          where: { id: dto.productId },
          data: {
            avgRating: aggregate._avg.rating ?? 0,
            reviewCount: aggregate._count,
          },
        })

        return created
      })

      return review
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product')
      }
      throw error
    }
  }

  async findReviewsForProduct(productSlug: string, query: ReviewQueryDto) {
    const { page = 1, limit = 10 } = query

    const product = await this.prismaService.product.findUnique({
      where: { slug: productSlug },
      select: { id: true, avgRating: true, reviewCount: true },
    })
    if (!product) {
      throw new NotFoundException(`Product with slug "${productSlug}" not found`)
    }

    const skip = (page - 1) * limit

    const reviews = await this.prismaService.review.findMany({
      where: { productId: product.id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // Mask email to first-name-like prefix for privacy: jane.doe@x.com → "Jane d."
    const sanitized = reviews.map((review) => {
      const localPart = review.user.email.split('@')[0] ?? 'User'
      const cleaned = localPart.replace(/[._-]+/g, ' ')
      const firstWord = cleaned.split(' ')[0] ?? 'User'
      const displayName =
        firstWord.charAt(0).toUpperCase() + firstWord.slice(1, 6).toLowerCase() + '.'

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        displayName,
        createdAt: review.createdAt,
      }
    })

    return {
      data: sanitized,
      meta: {
        totalCount: product.reviewCount,
        avgRating: product.avgRating,
        page,
        limit,
        totalPages: Math.ceil(product.reviewCount / limit),
      },
    }
  }

  async findUserReviewForProduct(userId: string, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId query parameter is required')
    }
    return this.prismaService.review.findUnique({
      where: { userId_productId: { userId, productId } },
    })
  }

  async checkReviewEligibility(userId: string, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId query parameter is required')
    }

    const [purchasedItem, existingReview] = await Promise.all([
      this.prismaService.orderItem.findFirst({
        where: {
          productId,
          order: { userId, status: { in: REVIEWABLE_STATUSES } },
        },
        select: { id: true },
      }),
      this.prismaService.review.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { id: true },
      }),
    ])

    return {
      hasPurchased: Boolean(purchasedItem),
      hasReviewed: Boolean(existingReview),
      canReview: Boolean(purchasedItem) && !existingReview,
    }
  }
}
