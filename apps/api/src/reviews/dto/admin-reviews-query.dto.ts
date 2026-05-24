import { ReviewStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

export class AdminReviewsQueryDto {
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus

  /** Star rating (1–5). Used to surface low-rated reviews fast. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number
}
