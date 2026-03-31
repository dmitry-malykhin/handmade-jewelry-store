import { ProductStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { ProductSortField, SortOrder } from './product-query.dto'

export class AdminProductQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus

  @IsString()
  @IsOptional()
  categorySlug?: string

  @IsString()
  @IsOptional()
  search?: string

  @IsEnum(ProductSortField)
  @IsOptional()
  sortBy?: ProductSortField = ProductSortField.CREATED_AT

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC
}
