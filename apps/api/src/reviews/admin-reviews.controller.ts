import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto'
import { SellerReplyDto } from './dto/seller-reply.dto'
import { UpdateReviewStatusDto } from './dto/update-review-status.dto'
import { ReviewsService } from './reviews.service'

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(@Query() adminReviewsQueryDto: AdminReviewsQueryDto) {
    return this.reviewsService.findAllForAdmin(adminReviewsQueryDto)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') reviewId: string,
    @Body() updateReviewStatusDto: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateStatusForAdmin(reviewId, updateReviewStatusDto)
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  reply(@Param('id') reviewId: string, @Body() sellerReplyDto: SellerReplyDto) {
    return this.reviewsService.setSellerReply(reviewId, sellerReplyDto)
  }
}
