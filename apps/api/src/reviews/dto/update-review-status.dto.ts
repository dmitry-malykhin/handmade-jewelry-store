import { ReviewStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus
}
