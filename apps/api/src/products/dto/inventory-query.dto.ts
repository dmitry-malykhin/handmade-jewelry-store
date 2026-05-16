import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

/**
 * Query for the admin inventory view. Sorted by stock ASC so the most-at-risk
 * products surface first. Threshold defaults to 3 — handmade stores rarely
 * benefit from per-category thresholds, so we keep it global and query-driven
 * rather than persisting it.
 */
export class InventoryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  threshold?: number = 3

  /** When true, returns only products at or below the threshold. */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  lowStockOnly?: boolean = false
}
