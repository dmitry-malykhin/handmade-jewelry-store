import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'
import { ReviewsService } from './reviews.service'

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, dto)
  }

  @Get('products/:slug/reviews')
  list(@Param('slug') slug: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findReviewsForProduct(slug, query)
  }

  @Get('reviews/mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: User, @Query('productId') productId: string) {
    return this.reviewsService.findUserReviewForProduct(user.id, productId)
  }

  @Get('reviews/eligibility')
  @UseGuards(JwtAuthGuard)
  checkEligibility(@CurrentUser() user: User, @Query('productId') productId: string) {
    return this.reviewsService.checkReviewEligibility(user.id, productId)
  }
}
