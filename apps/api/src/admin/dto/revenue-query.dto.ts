import { IsIn, IsOptional } from 'class-validator'
import type { RevenueChartPeriod } from '@jewelry/shared'

export class RevenueQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  period?: RevenueChartPeriod
}
