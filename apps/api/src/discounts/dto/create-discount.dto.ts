import { DiscountType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator'

export class CreateDiscountDto {
  /**
   * 3-30 chars, letters/digits/dash/underscore. Normalised to UPPERCASE in
   * the service layer so storage is case-insensitive without Postgres citext.
   */
  @IsString()
  @Length(3, 30)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must contain only letters, digits, dash or underscore',
  })
  code!: string

  @IsEnum(DiscountType)
  type!: DiscountType

  /**
   * For PERCENTAGE: 1-100. For FIXED_AMOUNT: cents (>0). The service runs the
   * cross-field range check because class-validator can't see `type` from
   * inside a `value` decorator cleanly.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderCents?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsages?: number

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
