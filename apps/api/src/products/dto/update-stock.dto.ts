import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'

/**
 * Quick stock update via the admin inventory page — separate from the full
 * product edit form so inline edits don't require loading product images / SEO
 * fields / etc.
 *
 * Max 9999 is a sanity bound — handmade stores realistically never exceed
 * three-digit stock counts per piece.
 */
export class UpdateStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  stock!: number
}
