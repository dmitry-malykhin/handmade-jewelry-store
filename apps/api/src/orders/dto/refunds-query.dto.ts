import { RefundReason } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Filters for the admin refunds ledger. All four are optional — empty params
 * return every refund (matches the pre-existing behaviour).
 *
 * Filters compose with AND semantics — a request for `reason=ITEM_DAMAGED&from=2026-01-01`
 * returns only damaged items refunded on or after Jan 1.
 */
export class RefundsQueryDto {
  /** Inclusive lower bound on `refundedAt`. ISO 8601 date or datetime. */
  @IsDateString()
  @IsOptional()
  from?: string

  /** Inclusive upper bound on `refundedAt`. ISO 8601 date or datetime. */
  @IsDateString()
  @IsOptional()
  to?: string

  @IsEnum(RefundReason)
  @IsOptional()
  reason?: RefundReason

  /**
   * Substring match against `guestEmail` and the linked user's email.
   * Case-insensitive. Capped at 254 chars — RFC 5321 max email length.
   */
  @IsString()
  @IsOptional()
  @MaxLength(254)
  customer?: string
}
