import { OrderStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional } from 'class-validator'

/**
 * Filters for the admin CSV export of orders. All three are optional — the
 * default export returns every order ever placed (matches the AC: "All orders
 * included when no filters applied").
 */
export class OrderExportQueryDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus

  /** Inclusive lower bound on `createdAt`. ISO 8601 date or datetime. */
  @IsDateString()
  @IsOptional()
  from?: string

  /** Inclusive upper bound on `createdAt`. ISO 8601 date or datetime. */
  @IsDateString()
  @IsOptional()
  to?: string
}
