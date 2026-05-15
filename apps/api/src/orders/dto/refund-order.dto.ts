import { RefundReason } from '@prisma/client'
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class RefundOrderDto {
  /**
   * Refund amount in USD. Omit for a full refund — the service computes the
   * remaining refundable amount (total minus already refunded).
   *
   * Floats accepted because Decimal arithmetic happens in the service layer.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number

  @IsEnum(RefundReason)
  reason!: RefundReason

  /**
   * Internal admin note (not surfaced to the customer). Used in the refunds
   * list to reconstruct context months later.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
