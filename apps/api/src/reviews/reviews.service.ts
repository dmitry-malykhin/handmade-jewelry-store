import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { OrderStatus, Prisma, ReviewStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'
import { SellerReplyDto } from './dto/seller-reply.dto'
import { UpdateReviewStatusDto } from './dto/update-review-status.dto'

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

    // Verified-purchase guard.
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
      const review = await this.prismaService.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            userId,
            productId: dto.productId,
            rating: dto.rating,
            comment: dto.comment,
          },
        })

        // Only APPROVED reviews — PENDING/HIDDEN must not inflate the rating.
        const aggregate = await tx.review.aggregate({
          where: { productId: dto.productId, status: ReviewStatus.APPROVED },
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
      where: { productId: product.id, status: ReviewStatus.APPROVED },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // jane.doe@x.com → "Jane d." — privacy mask.
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
        sellerReply: review.sellerReply,
        sellerRepliedAt: review.sellerRepliedAt,
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

  async findAllForAdmin(query: AdminReviewsQueryDto) {
    const { status, rating, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit

    const whereClause: Prisma.ReviewWhereInput = {
      ...(status && { status }),
      ...(rating !== undefined && { rating }),
    }

    const [reviews, totalCount] = await Promise.all([
      this.prismaService.review.findMany({
        where: whereClause,
        include: {
          user: { select: { email: true } },
          product: { select: { id: true, slug: true, title: true, images: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaService.review.count({ where: whereClause }),
    ])

    return {
      data: reviews,
      meta: { totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    }
  }

  // Recomputes product.avgRating + reviewCount in the same transaction —
  // hiding a 5-star review must drop it from the public average immediately.
  async updateStatusForAdmin(reviewId: string, dto: UpdateReviewStatusDto) {
    const review = await this.prismaService.review.findUnique({ where: { id: reviewId } })
    if (!review) {
      throw new NotFoundException(`Review with id "${reviewId}" not found`)
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { status: dto.status },
      })

      const aggregate = await tx.review.aggregate({
        where: { productId: review.productId, status: ReviewStatus.APPROVED },
        _avg: { rating: true },
        _count: true,
      })

      await tx.product.update({
        where: { id: review.productId },
        data: {
          avgRating: aggregate._avg.rating ?? 0,
          reviewCount: aggregate._count,
        },
      })

      return updated
    })
  }

  async setSellerReply(reviewId: string, dto: SellerReplyDto) {
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    })
    if (!review) {
      throw new NotFoundException(`Review with id "${reviewId}" not found`)
    }

    return this.prismaService.review.update({
      where: { id: reviewId },
      data: {
        sellerReply: dto.reply,
        sellerRepliedAt: new Date(),
      },
    })
  }
}
