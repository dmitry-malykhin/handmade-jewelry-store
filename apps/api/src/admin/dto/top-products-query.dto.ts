import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import type { RevenueChartPeriod } from '@jewelry/shared'

export class TopProductsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  period?: RevenueChartPeriod

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number
}
