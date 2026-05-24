import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminReviewsController } from './admin-reviews.controller'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
