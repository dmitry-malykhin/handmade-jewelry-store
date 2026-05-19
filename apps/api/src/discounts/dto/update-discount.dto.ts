import { Type } from 'class-transformer'
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator'

/**
 * Partial update — admin can flip activation, extend expiry, change usage
 * cap. Code + type + value are NOT editable after creation: customers may
 * have screenshots of the code with its original terms.
 */
export class UpdateDiscountDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderCents?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsages?: number | null

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null
}
