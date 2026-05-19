import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator'

export class ValidateDiscountDto {
  @IsString()
  @Length(1, 30)
  code!: string

  /**
   * Cart subtotal in cents. Used to enforce `minOrderCents`. Optional so the
   * frontend can pre-validate a code (e.g. when admin checks it works) before
   * the cart is fully assembled.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotalCents?: number
}
