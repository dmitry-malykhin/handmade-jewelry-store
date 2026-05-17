import { ProductionStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateProductionDto {
  @IsEnum(ProductionStatus)
  productionStatus!: ProductionStatus

  /**
   * Admin-only note. Surfaces in the production tracker row so the maker can
   * keep context per piece ("customer wants extra polish", "waiting on beads
   * from supplier", etc).
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  productionNotes?: string
}
